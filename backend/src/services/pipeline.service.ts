import { agent_log_model } from '../models/agent-log.model.js';
import type { Job, LogLevel } from '../models/entities.js';
import { job_model } from '../models/job.model.js';
import { nextStage, type PipelineStage, stagesFrom } from '../models/pipeline.js';
import { video_model } from '../models/video.model.js';
import { video_stage_model } from '../models/video-stage.model.js';
import { logger } from '../lib/logger.js';

const RETRY_BASE_SECONDS = 30;

/**
 * Máquina de estados da linha de produção. Concentra as transições para que
 * API e workers nunca alterem status de vídeo/etapa por conta própria.
 */
export class PipelineService {
  async log(video_id: string | null, stage: PipelineStage | null, message: string, level: LogLevel = 'info') {
    try {
      await agent_log_model.write({ video_id, stage, message, level });
    } catch (error) {
      logger.warn({ error }, 'falha ao gravar agent_log');
    }
  }

  /** Inicia (ou reinicia) a produção a partir de uma etapa. */
  async startFrom(video_id: string, stage: PipelineStage, payload: Record<string, unknown> = {}): Promise<Job> {
    await job_model.cancelPendingForVideo(video_id);
    await video_stage_model.initializeForVideo(video_id);
    await video_stage_model.resetStages(video_id, stagesFrom(stage));
    await video_model.update(video_id, {
      status: stage === 'agenda' ? 'approved' : 'queued',
      current_stage: stage,
      error_message: null,
    });
    return job_model.enqueue(video_id, stage, payload);
  }

  async markRunning(job: Job): Promise<void> {
    await video_stage_model.setStatus(job.video_id, job.stage, {
      status: 'running',
      attempts: job.attempts,
      started_at: new Date().toISOString(),
      error: null,
    });
    if (job.stage !== 'agenda') {
      await video_model.update(job.video_id, { status: 'in_production', current_stage: job.stage });
    }
  }

  async complete(job: Job, output: Record<string, unknown>): Promise<void> {
    await job_model.update(job.id, { status: 'done', locked_by: null });
    await video_stage_model.setStatus(job.video_id, job.stage, {
      status: 'done',
      output,
      finished_at: new Date().toISOString(),
    });

    const next = nextStage(job.stage);
    if (next === 'agenda') {
      await video_model.update(job.video_id, { status: 'awaiting_approval', current_stage: null });
      await this.log(job.video_id, null, 'vídeo pronto — esperando o seu OK');
    } else if (next) {
      await video_model.update(job.video_id, { current_stage: next });
      await job_model.enqueue(job.video_id, next);
    } else {
      await video_model.update(job.video_id, { current_stage: null });
    }
  }

  async fail(job: Job, error: Error): Promise<void> {
    const can_retry = job.attempts < job.max_attempts;
    const message = error.message.slice(0, 2000);

    if (can_retry) {
      const delay = RETRY_BASE_SECONDS * 2 ** (job.attempts - 1);
      await job_model.update(job.id, {
        status: 'queued',
        locked_by: null,
        locked_at: null,
        last_error: message,
        run_after: new Date(Date.now() + delay * 1000).toISOString(),
      });
      await video_stage_model.setStatus(job.video_id, job.stage, { status: 'pending', error: message });
      await this.log(job.video_id, job.stage, `deu ruim (${job.attempts}/${job.max_attempts}), tentando de novo em ${delay}s: ${message}`, 'warn');
      return;
    }

    await job_model.update(job.id, { status: 'failed', locked_by: null, last_error: message });
    await video_stage_model.setStatus(job.video_id, job.stage, {
      status: 'failed',
      error: message,
      finished_at: new Date().toISOString(),
    });
    await video_model.update(job.video_id, { status: 'failed', error_message: `[${job.stage}] ${message}` });
    await this.log(job.video_id, job.stage, `falhou de vez: ${message}`, 'error');
  }
}

export const pipeline_service = new PipelineService();
