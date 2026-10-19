import type { Insert, Update, YoutubeAccount } from './entities.js';
import { BaseRepository, unwrap } from './base.repository.js';

class YoutubeAccountModel extends BaseRepository<YoutubeAccount, Insert<YoutubeAccount>, Update<YoutubeAccount>> {
  protected readonly table = 'youtube_accounts';
  protected readonly resource_name = 'Conta do YouTube';

  async findByChannelId(channel_id: string): Promise<YoutubeAccount | null> {
    const result = await this.db.select('*').eq('channel_id', channel_id).maybeSingle();
    return unwrap<YoutubeAccount | null>(result, 'youtube_accounts.findByChannelId');
  }

  async upsertForChannel(input: Insert<YoutubeAccount>): Promise<YoutubeAccount> {
    const result = await this.db.upsert(input, { onConflict: 'channel_id' }).select('*').single();
    return unwrap<YoutubeAccount>(result, 'youtube_accounts.upsertForChannel');
  }

  async deleteByChannelId(channel_id: string): Promise<void> {
    unwrap(await this.db.delete().eq('channel_id', channel_id), 'youtube_accounts.deleteByChannelId');
  }
}

export const youtube_account_model = new YoutubeAccountModel();
