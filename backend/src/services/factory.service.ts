import { agent_log_model } from '../models/agent-log.model.js';
import type { AgentLog, VideoStatus } from '../models/entities.js';
import { job_model } from '../models/job.model.js';
import { PIPELINE_STAGES, type PipelineStage, STAGE_LABELS } from '../models/pipeline.js';
import { video_model } from '../models/video.model.js';
import { video_stage_model } from '../models/video-stage.model.js';

export type AgentState = 'idle' | 'working' | 'done' | 'waiting' | 'error';

export interface AgentStatus {
  stage: PipelineStage;
  label: string;
  position: number;
  state: AgentState;
  video_title: string | null;
  speech: string | null;
}

export interface FactoryStatus {
  agents: AgentStatus[];
  counts: Partial<Record<VideoStatus, number>>;
  queued_jobs: number;
  logs: AgentLog[];
  active_video: { id: string; title: string | null; current_stage: PipelineStage | null; progress: number } | null;
}

/** Monta a visão "escritório dos agentes" da fábrica. */
export class FactoryService {
  async status(): Promise<FactoryStatus> {
    const [active, counts, queued_jobs, logs] = await Promise.all([
      video_model.listActiveInProduction(),
      video_model.countByStatus(),
      job_model.countQueued(),
      agent_log_model.listRecent({ limit: 30 }),
    ]);
    const speeches = await agent_log_model.latestPerStage(active.map((video) => video.id));
    const stages = await video_stage_model.listByVideos(active.map((video) => video.id));
    const focus = active[0] ?? null;
    const focus_stages = stages.filter((stage) => stage.video_id === focus?.id);

    const agents = PIPELINE_STAGES.map((stage, index): AgentStatus => {
      const running = stages.find((item) => item.stage === stage && item.status === 'running');
      const running_video = running ? active.find((video) => video.id === running.video_id) : null;
      const focus_stage = focus_stages.find((item) => item.stage === stage);
      let state: AgentState = 'idle';
      if (running) state = 'working';
      else if (focus_stage?.status === 'failed') state = 'error';
      else if (focus_stage?.status === 'done') state = 'done';
      else if (stage === 'agenda' && (counts.awaiting_approval ?? 0) > 0) state = 'waiting';

      // Fala do vídeo que este agente está tocando agora (ou do vídeo em foco).
      const speech_video = running?.video_id ?? focus?.id;
      const speech = speech_video ? speeches.get(`${speech_video}:${stage}`) : undefined;
      const fresh = speech && Date.now() - new Date(speech.created_at).getTime() < 30 * 60_000;
      return {
        stage,
        label: STAGE_LABELS[stage],
        position: index + 1,
        state,
        video_title: running_video?.title ?? running_video?.topic ?? null,
        speech: state === 'waiting' ? 'esperando o seu OK no sofá' : fresh ? speech.message : null,
      };
    });

    const done_count = focus_stages.filter((stage) => stage.status === 'done' && stage.stage !== 'agenda').length;
    return {
      agents,
      counts,
      queued_jobs,
      logs,
      active_video: focus
        ? {
            id: focus.id,
            title: focus.title ?? focus.topic,
            current_stage: focus.current_stage,
            progress: Math.round((done_count / (PIPELINE_STAGES.length - 1)) * 100),
          }
        : null,
    };
  }

  async logs(filters: { video_id?: string; after_id?: number; limit?: number }) {
    return agent_log_model.listRecent(filters);
  }
}

export const factory_service = new FactoryService();
