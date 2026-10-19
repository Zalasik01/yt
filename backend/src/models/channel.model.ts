import type { Channel, Insert, Update } from './entities.js';
import { BaseRepository, unwrap } from './base.repository.js';

class ChannelModel extends BaseRepository<Channel, Insert<Channel>, Update<Channel>> {
  protected readonly table = 'channels';
  protected readonly resource_name = 'Canal';

  async listActive(): Promise<Channel[]> {
    const result = await this.db.select('*').eq('is_active', true).order('created_at');
    return unwrap<Channel[]>(result, 'channels.listActive');
  }
}

export const channel_model = new ChannelModel();
