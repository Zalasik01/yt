import { useState } from 'react';
import { useVideos } from '../api/hooks';
import { mediaUrl } from '../api/client';
import { formatDateTime, formatDuration } from '../lib/format';
import { VideoModal } from '../components/VideoModal';

export function ShortsPage() {
  const { data: videos = [] } = useVideos({ limit: 100 });
  const [open, setOpen] = useState<string | null>(null);
  const shorts = videos.flatMap((video) => video.shorts.map((short) => ({ ...short, parent: video })));

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Shorts</h1>
          <p className="page-sub">Cortes verticais gerados a partir de cada vídeo longo.</p>
        </div>
      </div>
      {shorts.length === 0 && <div className="empty">Nenhum short ainda.</div>}
      <div className="shorts-row">
        {shorts.map((short) => (
          <div key={short.id} className="panel scard">
            {short.video_path && <video src={mediaUrl(short.video_path)} controls preload="metadata" />}
            <div className="scard-body">
              <strong>{short.title}</strong>
              <div className="muted">
                {formatDuration(short.end_seconds - short.start_seconds)} · {short.status}
                {short.scheduled_at ? ` · ${formatDateTime(short.scheduled_at)}` : ''}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setOpen(short.parent.id)}>
                Ver vídeo de origem
              </button>
            </div>
          </div>
        ))}
      </div>
      {open && <VideoModal id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
