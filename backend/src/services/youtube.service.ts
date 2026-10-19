import { channel_model } from '../models/channel.model.js';
import { youtube_account_model } from '../models/youtube-account.model.js';
import { youtube_provider } from '../providers/youtube/youtube.provider.js';

export class YoutubeService {
  async authUrl(channel_id: string): Promise<string> {
    await channel_model.getById(channel_id);
    return youtube_provider.authUrl(channel_id);
  }

  async handleCallback(code: string, state: string): Promise<string> {
    const channel_id = youtube_provider.verifyState(state);
    const result = await youtube_provider.exchangeCode(code);
    await youtube_account_model.upsertForChannel({ channel_id, ...result });
    return channel_id;
  }
}

export const youtube_service = new YoutubeService();
