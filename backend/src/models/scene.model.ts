import type { Insert, Scene, Update } from './entities.js';
import { BaseRepository, unwrap } from './base.repository.js';

class SceneModel extends BaseRepository<Scene, Insert<Scene>, Update<Scene>> {
  protected readonly table = 'scenes';
  protected readonly resource_name = 'Cena';

  async listByVideo(video_id: string): Promise<Scene[]> {
    const result = await this.db.select('*').eq('video_id', video_id).order('position');
    return unwrap<Scene[]>(result, 'scenes.listByVideo');
  }

  async replaceForVideo(video_id: string, scenes: Insert<Scene>[]): Promise<Scene[]> {
    unwrap(await this.db.delete().eq('video_id', video_id), 'scenes.replaceForVideo.delete');
    return this.createMany(scenes);
  }
}

export const scene_model = new SceneModel();
