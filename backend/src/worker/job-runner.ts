import { hostname } from 'node:os';
import { getAgent } from '../agents/index.js';
import type { AgentContext } from '../agents/agent.types.js';
import { channel_model } from '../models/channel.model.js';
import type { Job } from '../models/entities.js';
import { job_model } from '../models/job.model.js';
import { video_model } from '../models/video.model.js';
import { pipeline_service } from '../services/pipeline.service.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { VideoWorkspace } from '../lib/workspace.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Consome a fila de jobs: N slots concorrentes por processo, N processos por cluster. */
export class JobRunner {
  private running = true;
  readonly worker_id = env.WORKER_ID ?? `${hostname()}-${process.pid}`;

  stop() {
    this.running = false;
  }

  async start(): Promise<void> {
    logger.info({ worker_id: this.worker_id, concurrency: env.WORKER_CONCURRENCY }, 'worker iniciado');
    await Promise.all(Array.from({ length: env.WORKER_CONCURRENCY }, (_, slot) => this.loop(slot)));
  }

  private async loop(slot: number): Promise<void> {
    while (this.running) {
      try {
        const job = await job_model.claimNext(`${this.worker_id}#${slot}`);
        if (!job) {
          await sleep(env.WORKER_POLL_INTERVAL_MS);
          continue;
        }
        await this.execute(job);
      } catch (error) {
        logger.error({ error }, 'erro no loop do worker');
        await sleep(env.WORKER_POLL_INTERVAL_MS);
      }
    }
  }

  async execute(job: Job): Promise<void> {
    const log = logger.child({ job_id: job.id, video_id: job.video_id, stage: job.stage, attempt: job.attempts });
    const started = Date.now();
    log.info('job iniciado');

    try {
      const video = await video_model.getById(job.video_id);
      const channel = await channel_model.getById(video.channel_id);
      const workspace = await new VideoWorkspace(video.id).ensure();
      const context: AgentContext = {
        job,
        video,
        channel,
        workspace,
        say: (message, level) => pipeline_service.log(video.id, job.stage, message, level),
        refreshVideo: () => video_model.getById(video.id),
      };

      await pipeline_service.markRunning(job);
      const output = await getAgent(job.stage).run(context);
      await pipeline_service.complete(job, output);
      if (job.stage === 'agenda' || job.stage === 'thumbnail') await workspace.clean();
      log.info({ duration_ms: Date.now() - started }, 'job concluído');
    } catch (error) {
      log.error({ error, duration_ms: Date.now() - started }, 'job falhou');
      await pipeline_service.fail(job, error instanceof Error ? error : new Error(String(error)));
    }
  }
}
