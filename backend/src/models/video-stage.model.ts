import type { Insert, StageStatus, Update, VideoStage } from './entities.js';
import type { PipelineStage } from './pipeline.js';
import { PIPELINE_STAGES } from './pipeline.js';
import { BaseRepository, unwrap } from './base.repository.js';

class VideoStageModel extends BaseRepository<VideoStage, Insert<VideoStage>, Update<VideoStage>> {
  protected readonly table = 'video_stages';
  protected readonly resource_name = 'Etapa';

  async initializeForVideo(video_id: string): Promise<VideoStage[]> {
    const rows = PIPELINE_STAGES.map((stage) => ({ video_id, stage, status: 'pending' as StageStatus }));
    const result = await this.db.upsert(rows, { onConflict: 'video_id,stage' }).select('*');
    return unwrap<VideoStage[]>(result, 'video_stages.initializeForVideo');
  }

  async listByVideo(video_id: string): Promise<VideoStage[]> {
    const result = await this.db.select('*').eq('video_id', video_id);
    const rows = unwrap<VideoStage[]>(result, 'video_stages.listByVideo');
    return rows.sort((a, b) => PIPELINE_STAGES.indexOf(a.stage) - PIPELINE_STAGES.indexOf(b.stage));
  }

  async listByVideos(video_ids: string[]): Promise<VideoStage[]> {
    if (video_ids.length === 0) return [];
    const result = await this.db.select('*').in('video_id', video_ids);
    return unwrap<VideoStage[]>(result, 'video_stages.listByVideos');
  }

  async findOne(video_id: string, stage: PipelineStage): Promise<VideoStage | null> {
    const result = await this.db.select('*').eq('video_id', video_id).eq('stage', stage).maybeSingle();
    return unwrap<VideoStage | null>(result, 'video_stages.findOne');
  }

  async setStatus(
    video_id: string,
    stage: PipelineStage,
    patch: Update<VideoStage> & { status: StageStatus },
  ): Promise<void> {
    const result = await this.db.update(patch).eq('video_id', video_id).eq('stage', stage);
    unwrap(result, 'video_stages.setStatus');
  }

  async resetStages(video_id: string, stages: PipelineStage[]): Promise<void> {
    const result = await this.db
      .update({ status: 'pending', output: null, error: null, started_at: null, finished_at: null })
      .eq('video_id', video_id)
      .in('stage', stages);
    unwrap(result, 'video_stages.resetStages');
  }
}

export const video_stage_model = new VideoStageModel();
