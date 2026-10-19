import { channel_model } from '../models/channel.model.js';
import { job_model } from '../models/job.model.js';
import { video_model } from '../models/video.model.js';
import { video_service } from '../services/video.service.js';
import { logger } from '../lib/logger.js';
import { supabase } from '../lib/supabase.js';

/** Quantos vídeos em andamento (não agendados) cada canal com auto_produce mantém. */
const AUTO_PRODUCE_BUFFER = 2;

export async function runMaintenance(): Promise<void> {
  const requeued = await job_model.requeueStale(30);
  if (requeued) logger.warn({ requeued }, 'jobs presos devolvidos à fila');

  // O YouTube publica sozinho no publishAt; aqui só refletimos o status.
  const now = new Date().toISOString();
  const published = await supabase
    .from('videos')
    .update({ status: 'published', published_at: now })
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .select('id');
  if (published.data?.length) logger.info({ count: published.data.length }, 'vídeos marcados como publicados');
  await supabase.from('shorts').update({ status: 'published' }).eq('status', 'scheduled').lte('scheduled_at', now);

  for (const channel of await channel_model.listActive()) {
    if (!channel.auto_produce) continue;
    const pending = await video_model.list(
      { channel_id: channel.id, status: ['queued', 'in_production', 'awaiting_approval', 'approved'] },
      { limit: AUTO_PRODUCE_BUFFER },
    );
    if (pending.length < AUTO_PRODUCE_BUFFER) {
      logger.info({ channel_id: channel.id }, 'auto_produce: criando nova pauta');
      await video_service.create({ channel_id: channel.id });
    }
  }
}
