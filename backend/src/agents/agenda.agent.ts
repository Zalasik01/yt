import { channel_model } from '../models/channel.model.js';
import { short_model } from '../models/short.model.js';
import { video_model } from '../models/video.model.js';
import { youtube_account_model } from '../models/youtube-account.model.js';
import { youtube_provider } from '../providers/youtube/youtube.provider.js';
import { nextFreeSlot } from '../lib/schedule.js';
import { AppError } from '../lib/errors.js';
import type { Agent, AgentContext } from './agent.types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** 8 · Agenda — só roda após a aprovação: agenda e envia ao YouTube. */
export class AgendaAgent implements Agent {
  readonly stage = 'agenda' as const;

  async run({ video, channel, workspace, job, say }: AgentContext) {
    if (!video.video_path) throw new AppError('Vídeo sem arquivo final', 422, 'missing_video');

    const requested = typeof job.payload.scheduled_at === 'string' ? new Date(job.payload.scheduled_at) : null;
    const publish_at = requested ?? (await this.pickSlot(channel.id, video.id));
    await say(`horário escolhido: ${publish_at.toLocaleString('pt-BR', { timeZone: channel.publish_timezone })}`);

    const account = await youtube_account_model.findByChannelId(channel.id);
    const shorts = await short_model.listByVideo(video.id);

    if (!account) {
      await video_model.update(video.id, { scheduled_at: publish_at.toISOString(), status: 'approved' });
      await say('YouTube não conectado — vídeo aprovado e reservado no calendário. Conecte o canal para envio automático.', 'warn');
      return { uploaded: false, scheduled_at: publish_at.toISOString() };
    }

    await say('subindo o vídeo para o YouTube...');
    const file_path = await workspace.fetch(video.video_path);
    const youtube_video_id = await youtube_provider.uploadScheduled({
      refresh_token: account.refresh_token,
      file_path,
      title: video.title ?? video.topic ?? 'Sem título',
      description: video.description ?? '',
      tags: video.tags,
      publish_at,
      language: channel.language,
    });

    if (video.thumbnail_path) {
      try {
        await youtube_provider.setThumbnail(account.refresh_token, youtube_video_id, await workspace.fetch(video.thumbnail_path));
      } catch (error) {
        // Canais não verificados não podem enviar thumbnail customizada.
        await say(`thumbnail não enviada: ${(error as Error).message}`, 'warn');
      }
    }

    await video_model.update(video.id, {
      youtube_video_id,
      scheduled_at: publish_at.toISOString(),
      status: 'scheduled',
    });

    // Shorts: um por dia, no mesmo horário, a partir do dia seguinte ao vídeo longo.
    for (const [index, short] of shorts.entries()) {
      if (!short.video_path) continue;
      const short_at = new Date(publish_at.getTime() + (index + 1) * DAY_MS);
      await say(`agendando short ${index + 1}/${shorts.length}...`);
      const short_id = await youtube_provider.uploadScheduled({
        refresh_token: account.refresh_token,
        file_path: await workspace.fetch(short.video_path),
        title: short.title,
        description: `${short.description ?? ''}\n\nVídeo completo: https://youtu.be/${youtube_video_id}`,
        tags: [...video.tags.slice(0, 10), 'shorts'],
        publish_at: short_at,
        language: channel.language,
      });
      await short_model.update(short.id, {
        youtube_video_id: short_id,
        scheduled_at: short_at.toISOString(),
        status: 'scheduled',
      });
    }

    await say(`agendado! youtu.be/${youtube_video_id}`);
    return { uploaded: true, youtube_video_id, scheduled_at: publish_at.toISOString(), shorts: shorts.length };
  }

  private async pickSlot(channel_id: string, video_id: string): Promise<Date> {
    const channel = await channel_model.getById(channel_id);
    const now = new Date();
    const horizon = new Date(now.getTime() + 180 * DAY_MS);
    const booked = await video_model.listScheduledBetween(channel_id, now.toISOString(), horizon.toISOString());
    return nextFreeSlot(
      { time_zone: channel.publish_timezone, days: channel.publish_days, times: channel.publish_times },
      booked.filter((item) => item.id !== video_id).map((item) => new Date(item.scheduled_at!)),
      { from: now },
    );
  }
}
