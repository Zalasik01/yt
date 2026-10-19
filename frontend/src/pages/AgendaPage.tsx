import { useState } from 'react';
import { useVideos } from '../api/hooks';
import { mediaUrl } from '../api/client';
import type { Short, Video } from '../api/types';
import { VideoModal } from '../components/VideoModal';

type Entry = { at: string; kind: 'video' | 'short'; video: Video; short?: Short };

export function AgendaPage() {
  const { data: videos = [] } = useVideos({ status: ['approved', 'scheduled'], limit: 100 });
  const [open, setOpen] = useState<string | null>(null);

  const entries: Entry[] = videos
    .flatMap((video): Entry[] => [
      ...(video.scheduled_at ? [{ at: video.scheduled_at, kind: 'video' as const, video }] : []),
      ...video.shorts
        .filter((short) => short.scheduled_at)
        .map((short) => ({ at: short.scheduled_at!, kind: 'short' as const, video, short })),
    ])
    .sort((a, b) => a.at.localeCompare(b.at));

  const by_day = new Map<string, Entry[]>();
  for (const entry of entries) {
    const day = new Date(entry.at).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    by_day.set(day, [...(by_day.get(day) ?? []), entry]);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-sub">O que vai ao ar e quando. O YouTube publica sozinho no horário.</p>
        </div>
      </div>
      {entries.length === 0 && <div className="empty">Nada agendado ainda. Aprove um vídeo para ele entrar na agenda.</div>}
      {[...by_day.entries()].map(([day, items]) => (
        <section key={day} className="agenda-day">
          <h3>{day}</h3>
          {items.map((entry) => (
            <div key={`${entry.kind}-${entry.short?.id ?? entry.video.id}`} className="panel agenda-item" onClick={() => setOpen(entry.video.id)} style={{ cursor: 'pointer' }}>
              <span className="agenda-time">{new Date(entry.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              {entry.video.thumbnail_path ? <img src={mediaUrl(entry.video.thumbnail_path)} alt="" /> : <span />}
              <div>
                <strong>{entry.kind === 'short' ? entry.short!.title : entry.video.title}</strong>
                <div className="muted" style={{ fontSize: 13 }}>{entry.kind === 'short' ? 'Short' : 'Vídeo longo'}</div>
              </div>
              <span className={`tag ${entry.video.youtube_video_id ? 'tag-ok' : 'tag-warn'}`}>
                {entry.video.youtube_video_id ? 'no YouTube' : 'aguardando envio'}
              </span>
            </div>
          ))}
        </section>
      ))}
      {open && <VideoModal id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
