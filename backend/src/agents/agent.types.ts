import type { Channel, Job, LogLevel, Video } from '../models/entities.js';
import type { PipelineStage } from '../models/pipeline.js';
import type { VideoWorkspace } from '../lib/workspace.js';

export interface AgentContext {
  job: Job;
  video: Video;
  channel: Channel;
  workspace: VideoWorkspace;
  /** Mensagem curta que aparece no balão do agente e no console da fábrica. */
  say(message: string, level?: LogLevel): Promise<void>;
  /** Recarrega o vídeo do banco (após outro agente ter alterado). */
  refreshVideo(): Promise<Video>;
}

export type AgentOutput = Record<string, unknown>;

export interface Agent {
  readonly stage: PipelineStage;
  run(context: AgentContext): Promise<AgentOutput>;
}
