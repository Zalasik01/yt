import type { Insert, Update, Video, VideoStatus } from './entities.js';
import { BaseRepository, unwrap } from './base.repository.js';

class VideoModel extends BaseRepository<Video, Insert<Video>, Update<Video>> {
  protected readonly table = 'videos';
  protected readonly resource_name = 'Vídeo';

  async countByStatus(): Promise<Record<VideoStatus, number>> {
    const result = await this.db.select('status');
    const rows = unwrap<{ status: VideoStatus }[]>(result, 'videos.countByStatus');
    const counts = {} as Record<VideoStatus, number>;
    for (const { status } of rows) counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }

  async listRecentTitles(channel_id: string, limit = 100): Promise<string[]> {
    const result = await this.db
      .select('title, topic')
      .eq('channel_id', channel_id)
      .order('created_at', { ascending: false })
      .limit(limit);
    const rows = unwrap<{ title: string | null; topic: string | null }[]>(result, 'videos.listRecentTitles');
    return rows.map((row) => row.title ?? row.topic).filter((value): value is string => Boolean(value));
  }

  async listScheduledBetween(channel_id: string, from: string, to: string): Promise<Video[]> {
    const result = await this.db
      .select('*')
      .eq('channel_id', channel_id)
      .gte('scheduled_at', from)
      .lte('scheduled_at', to);
    return unwrap<Video[]>(result, 'videos.listScheduledBetween');
  }

  async listActiveInProduction(): Promise<Video[]> {
    const result = await this.db
      .select('*')
      .in('status', ['queued', 'in_production'])
      .order('updated_at', { ascending: false })
      .limit(20);
    return unwrap<Video[]>(result, 'videos.listActiveInProduction');
  }
}

export const video_model = new VideoModel();
