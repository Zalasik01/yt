import { useState } from 'react';
import { useVideos } from '../api/hooks';
import { mediaUrl } from '../api/client';
import { formatDateTime, formatDuration } from '../lib/format';
import { VideoModal } from '../components/VideoModal';
import { FadeIn } from '../components/ui/motion';
import { Skeleton } from '../components/ui/Skeleton';

export function ShortsPage() {
  const { data: videos = [], isLoading } = useVideos({ limit: 100 });
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
      {isLoading && (
        <div className="shorts-row">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="panel scard">
              <Skeleton width="100%" height={260} radius={0} />
              <div className="scard-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton width="85%" />
                <Skeleton width="50%" height={12} />
              </div>
            </div>
          ))}
        </div>
      )}
      {!isLoading && shorts.length === 0 && <div className="empty">Nenhum short ainda.</div>}
      <div className="shorts-row">
        {shorts.map((short, index) => (
          <FadeIn key={short.id} index={index}>
            <div className="panel scard">
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
          </FadeIn>
        ))}
      </div>
      {open && <VideoModal id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
