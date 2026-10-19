import type { Channel, Insert, Update } from '../models/entities.js';
import { channel_model } from '../models/channel.model.js';
import { youtube_account_model } from '../models/youtube-account.model.js';
import { youtube_provider } from '../providers/youtube/youtube.provider.js';

export type ChannelWithYoutube = Channel & {
  youtube: { connected: boolean; title: string | null; configured: boolean };
};

export class ChannelService {
  private async withYoutube(channel: Channel): Promise<ChannelWithYoutube> {
    const account = await youtube_account_model.findByChannelId(channel.id);
    return {
      ...channel,
      youtube: {
        connected: Boolean(account),
        title: account?.youtube_title ?? null,
        configured: youtube_provider.isConfigured(),
      },
    };
  }

  async list(): Promise<ChannelWithYoutube[]> {
    const channels = await channel_model.list({}, { order_by: 'created_at', ascending: true, limit: 100 });
    return Promise.all(channels.map((channel) => this.withYoutube(channel)));
  }

  async get(id: string): Promise<ChannelWithYoutube> {
    return this.withYoutube(await channel_model.getById(id));
  }

  async create(input: Partial<Insert<Channel>> & Pick<Channel, 'name' | 'niche'>): Promise<Channel> {
    return channel_model.create(input as Insert<Channel>);
  }

  async update(id: string, input: Update<Channel>): Promise<Channel> {
    return channel_model.update(id, input);
  }

  async remove(id: string): Promise<void> {
    await channel_model.getById(id);
    await channel_model.delete(id);
  }

  async disconnectYoutube(id: string): Promise<void> {
    await youtube_account_model.deleteByChannelId(id);
  }
}

export const channel_service = new ChannelService();
