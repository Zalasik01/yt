import { channel_model } from '../models/channel.model.js';
import type { Scene, Short, Video, VideoStage, VideoStatus } from '../models/entities.js';
import { job_model } from '../models/job.model.js';
import { PIPELINE_STAGES, type PipelineStage } from '../models/pipeline.js';
import { scene_model } from '../models/scene.model.js';
import { short_model } from '../models/short.model.js';
import { video_model } from '../models/video.model.js';
import { video_stage_model } from '../models/video-stage.model.js';
import { ConflictError } from '../lib/errors.js';
import { storage } from '../lib/storage/index.js';
import { pipeline_service } from './pipeline.service.js';

export interface VideoSummary extends Video {
  stages: Pick<VideoStage, 'stage' | 'status' | 'error'>[];
  shorts: Short[];
}

export interface VideoDetail extends VideoSummary {
  scenes: Scene[];
}

export interface ListVideosFilters {
  channel_id?: string;
  status?: VideoStatus[];
  limit?: number;
  offset?: number;
}

export class VideoService {
  async list(filters: ListVideosFilters): Promise<VideoSummary[]> {
    const videos = await video_model.list(
      { channel_id: filters.channel_id, status: filters.status },
      { limit: filters.limit, offset: filters.offset, order_by: 'created_at', ascending: false },
    );
    const ids = videos.map((video) => video.id);
    const [stages, shorts] = await Promise.all([video_stage_model.listByVideos(ids), short_model.listByVideos(ids)]);
    return videos.map((video) => ({
      ...video,
      stages: stages
        .filter((stage) => stage.video_id === video.id)
        .sort((a, b) => PIPELINE_STAGES.indexOf(a.stage) - PIPELINE_STAGES.indexOf(b.stage))
        .map(({ stage, status, error }) => ({ stage, status, error })),
      shorts: shorts.filter((short) => short.video_id === video.id),
    }));
  }

  async get(id: string): Promise<VideoDetail> {
    const video = await video_model.getById(id);
    const [stages, shorts, scenes] = await Promise.all([
      video_stage_model.listByVideo(id),
      short_model.listByVideo(id),
      scene_model.listByVideo(id),
    ]);
    return { ...video, stages: stages.map(({ stage, status, error }) => ({ stage, status, error })), shorts, scenes };
  }

  /** Cria um vídeo e coloca o agente de pauta para trabalhar. */
  async create(input: { channel_id: string; topic?: string | null }): Promise<Video> {
    await channel_model.getById(input.channel_id);
    const video = await video_model.create({
      channel_id: input.channel_id,
      topic: input.topic?.trim() || null,
      status: 'queued',
      current_stage: 'pauta',
      title: null,
      description: null,
      tags: [],
      angle: null,
      script: null,
      revision_notes: null,
      duration_seconds: null,
      video_path: null,
      thumbnail_path: null,
      thumbnail_text: null,
      scheduled_at: null,
      published_at: null,
      youtube_video_id: null,
      error_message: null,
    });
    await pipeline_service.startFrom(video.id, 'pauta');
    await pipeline_service.log(video.id, 'pauta', video.topic ? `nova pauta recebida: ${video.topic}` : 'nova pauta na mesa');
    return video;
  }

  async approve(id: string, scheduled_at?: string): Promise<Video> {
    const video = await video_model.getById(id);
    if (video.status !== 'awaiting_approval') {
      throw new ConflictError(`Só é possível aprovar vídeos aguardando aprovação (status atual: ${video.status})`);
    }
    await pipeline_service.startFrom(id, 'agenda', scheduled_at ? { scheduled_at } : {});
    await pipeline_service.log(id, 'agenda', 'aprovado! procurando o melhor horário...');
    return video_model.getById(id);
  }

  async reject(id: string, reason?: string): Promise<Video> {
    const video = await video_model.getById(id);
    if (['scheduled', 'published'].includes(video.status)) {
      throw new ConflictError('Vídeo já enviado ao YouTube — remova por lá');
    }
    await job_model.cancelPendingForVideo(id);
    await pipeline_service.log(id, null, `vídeo reprovado${reason ? `: ${reason}` : ''}`, 'warn');
    return video_model.update(id, { status: 'rejected', revision_notes: reason ?? video.revision_notes, current_stage: null });
  }

  /** Pede correções: refaz a partir da etapa escolhida, levando as notas. */
  async revise(id: string, notes: string, from_stage: PipelineStage = 'roteiro'): Promise<Video> {
    const video = await video_model.getById(id);
    if (['scheduled', 'published'].includes(video.status)) {
      throw new ConflictError('Vídeo já enviado ao YouTube — não dá para revisar');
    }
    if (from_stage === 'agenda') throw new ConflictError('Use a aprovação para a etapa de agenda');
    await video_model.update(id, { revision_notes: notes });
    await pipeline_service.startFrom(id, from_stage);
    await pipeline_service.log(id, from_stage, `revisão pedida: ${notes}`);
    return video_model.getById(id);
  }

  /** Reenfileira a etapa que falhou. */
  async retry(id: string): Promise<Video> {
    const video = await video_model.getById(id);
    if (video.status !== 'failed') throw new ConflictError('Só vídeos com falha podem ser reprocessados');
    const stages = await video_stage_model.listByVideo(id);
    const failed = stages.find((stage) => stage.status === 'failed')?.stage ?? video.current_stage ?? 'pauta';
    await pipeline_service.startFrom(id, failed);
    return video_model.getById(id);
  }

  async remove(id: string): Promise<void> {
    await video_model.getById(id);
    if (await job_model.hasActiveJob(id)) await job_model.cancelPendingForVideo(id);
    await video_model.delete(id);
    await storage.removePrefix(`videos/${id}`).catch(() => undefined);
  }
}

export const video_service = new VideoService();
