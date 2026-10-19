import type { Insert, Short, Update } from './entities.js';
import { BaseRepository, unwrap } from './base.repository.js';

class ShortModel extends BaseRepository<Short, Insert<Short>, Update<Short>> {
  protected readonly table = 'shorts';
  protected readonly resource_name = 'Short';

  async listByVideo(video_id: string): Promise<Short[]> {
    const result = await this.db.select('*').eq('video_id', video_id).order('position');
    return unwrap<Short[]>(result, 'shorts.listByVideo');
  }

  async listByVideos(video_ids: string[]): Promise<Short[]> {
    if (video_ids.length === 0) return [];
    const result = await this.db.select('*').in('video_id', video_ids).order('position');
    return unwrap<Short[]>(result, 'shorts.listByVideos');
  }

  async replaceForVideo(video_id: string, shorts: Insert<Short>[]): Promise<Short[]> {
    unwrap(await this.db.delete().eq('video_id', video_id), 'shorts.replaceForVideo.delete');
    return this.createMany(shorts);
  }
}

export const short_model = new ShortModel();
