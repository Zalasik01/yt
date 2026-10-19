export type PipelineStage =
  | 'pauta'
  | 'roteiro'
  | 'narracao'
  | 'cenas'
  | 'montagem'
  | 'shorts'
  | 'thumbnail'
  | 'agenda';

export type VideoStatus =
  | 'queued'
  | 'in_production'
  | 'awaiting_approval'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'rejected'
  | 'failed';

export type StageStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface Channel {
  id: string;
  name: string;
  niche: string;
  description: string | null;
  language: string;
  tone: string;
  target_duration_minutes: number;
  shorts_per_video: number;
  tts_provider: string;
  tts_voice: string;
  image_provider: string;
  image_style: string;
  publish_timezone: string;
  publish_days: number[];
  publish_times: string[];
  auto_produce: boolean;
  is_active: boolean;
  avatar_path: string | null;
  banner_path: string | null;
  youtube: { connected: boolean; title: string | null; configured: boolean };
}

export type ChannelInput = Partial<Omit<Channel, 'id' | 'youtube' | 'avatar_path' | 'banner_path'>>;

export type SuggestField = 'name' | 'niche' | 'description';
export type BrandingKind = 'avatar' | 'banner';

export interface Scene {
  id: string;
  position: number;
  narration_text: string;
  image_prompt: string | null;
  audio_path: string | null;
  image_path: string | null;
  duration_seconds: number | null;
}

export interface Short {
  id: string;
  video_id: string;
  position: number;
  title: string;
  hook: string | null;
  description: string | null;
  start_seconds: number;
  end_seconds: number;
  status: 'pending' | 'rendered' | 'scheduled' | 'published' | 'failed';
  video_path: string | null;
  scheduled_at: string | null;
  youtube_video_id: string | null;
}

export interface Video {
  id: string;
  channel_id: string;
  status: VideoStatus;
  current_stage: PipelineStage | null;
  topic: string | null;
  title: string | null;
  description: string | null;
  tags: string[];
  revision_notes: string | null;
  duration_seconds: number | null;
  video_path: string | null;
  thumbnail_path: string | null;
  thumbnail_text: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  youtube_video_id: string | null;
  error_message: string | null;
  created_at: string;
  stages: { stage: PipelineStage; status: StageStatus; error: string | null }[];
  shorts: Short[];
  scenes?: Scene[];
}

export interface AgentLog {
  id: number;
  video_id: string | null;
  stage: PipelineStage | null;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  created_at: string;
}

export interface AgentStatus {
  stage: PipelineStage;
  label: string;
  position: number;
  state: 'idle' | 'working' | 'done' | 'waiting' | 'error';
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

export interface MetaOptions {
  stages: { stage: PipelineStage; label: string }[];
  tts_providers: string[];
  image_providers: string[];
  llm_model: string;
  integrations: Record<string, boolean>;
  storage_driver: string;
}
