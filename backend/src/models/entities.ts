import type { PipelineStage } from './pipeline.js';

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
export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
export type ShortStatus = 'pending' | 'rendered' | 'scheduled' | 'published' | 'failed';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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
  created_at: string;
  updated_at: string;
}

export interface YoutubeAccount {
  id: string;
  channel_id: string;
  youtube_channel_id: string | null;
  youtube_title: string | null;
  refresh_token: string;
  scopes: string[];
  created_at: string;
  updated_at: string;
}

export interface ScriptBlock {
  narration: string;
  visual: string;
}

export interface VideoScript {
  hook: string;
  blocks: ScriptBlock[];
  outro: string;
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
  angle: string | null;
  script: VideoScript | null;
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
  updated_at: string;
}

export interface VideoStage {
  id: string;
  video_id: string;
  stage: PipelineStage;
  status: StageStatus;
  attempts: number;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  video_id: string;
  position: number;
  narration_text: string;
  image_prompt: string | null;
  search_query: string | null;
  audio_path: string | null;
  image_path: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
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
  status: ShortStatus;
  video_path: string | null;
  scheduled_at: string | null;
  youtube_video_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  video_id: string;
  stage: PipelineStage;
  status: JobStatus;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  run_after: string;
  locked_by: string | null;
  locked_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentLog {
  id: number;
  video_id: string | null;
  stage: PipelineStage | null;
  level: LogLevel;
  message: string;
  created_at: string;
}

type Generated = 'id' | 'created_at' | 'updated_at';
export type Insert<T> = Omit<T, Generated> & Partial<Pick<T, Extract<keyof T, Generated>>>;
export type Update<T> = Partial<Omit<T, Generated>>;
