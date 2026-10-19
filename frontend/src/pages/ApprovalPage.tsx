import { useState } from 'react';
import { useVideoAction, useVideos } from '../api/hooks';
import { mediaUrl } from '../api/client';
import { StatCard } from '../components/StatCard';
import { VideoCard, VideoCardSkeleton } from '../components/VideoCard';
import { VideoModal } from '../components/VideoModal';
import { FadeIn } from '../components/ui/motion';
import { Skeleton } from '../components/ui/Skeleton';

export function ApprovalPage() {
  const { data: awaiting = [], isLoading: loading_awaiting } = useVideos({ status: ['awaiting_approval'] });
  const { data: approved = [], isLoading: loading_approved } = useVideos({ status: ['approved', 'scheduled'] });
  const { data: in_production = [], isLoading: loading_production } = useVideos({ status: ['queued', 'in_production', 'failed'] });
  const action = useVideoAction();
  const [open, setOpen] = useState<string | null>(null);

  const awaiting_shorts = awaiting.flatMap((video) => video.shorts.map((short) => ({ ...short, parent: video })));
  const approved_shorts = approved.reduce((sum, video) => sum + video.shorts.length, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Aprovação</h1>
          <p className="page-sub">Nada vai ao ar sem o seu OK.</p>
        </div>
      </div>

      <div className="stats">
        <StatCard index={0} loading={loading_awaiting} label="Aguardando aprovação" value={awaiting.length} hint={`vídeos · ${awaiting_shorts.length} shorts`} />
        <StatCard index={1} loading={loading_approved} label="Aprovados" value={approved.length} hint={`vídeos · ${approved_shorts} shorts`} accent="var(--green)" />
        <StatCard index={2} loading={loading_production} label="Em produção" value={in_production.length} hint="na fábrica agora" accent="var(--blue)" />
      </div>

      <h2 className="section-title">
        Fila de aprovação <small>vídeos longos, clica um com os seus shorts</small>
      </h2>
      {loading_awaiting ? (
        <div className="cards">
          <VideoCardSkeleton />
          <VideoCardSkeleton />
        </div>
      ) : awaiting.length === 0 ? (
        <div className="empty" style={{ marginBottom: 30 }}>Nenhum vídeo esperando. Os agentes estão trabalhando ☕</div>
      ) : (
        <div className="cards">
          {awaiting.map((video, index) => (
            <VideoCard
              key={video.id}
              index={index}
              video={video}
              onOpen={setOpen}
              busy={action.isPending}
              onApprove={(id) => action.mutate({ id, action: 'approve' })}
            />
          ))}
        </div>
      )}

      {awaiting_shorts.length > 0 && (
        <>
          <h2 className="section-title">
            Shorts <small>aprovados junto com o vídeo de origem</small>
          </h2>
          <div className="shorts-row">
            {awaiting_shorts.map((short, index) => (
              <FadeIn key={short.id} index={index}>
                <div className="panel scard" onClick={() => setOpen(short.parent.id)} style={{ cursor: 'pointer' }}>
                  {short.video_path ? <video src={`${mediaUrl(short.video_path)}#t=1`} muted preload="metadata" /> : <Skeleton width="100%" height={220} radius={0} />}
                  <div className="scard-body">
                    <strong>{short.title}</strong>
                    <span className="muted">de: {short.parent.title}</span>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </>
      )}

      {in_production.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: 30 }}>Em produção</h2>
          <div className="cards">
            {in_production.map((video, index) => (
              <VideoCard key={video.id} index={index} video={video} onOpen={setOpen} />
            ))}
          </div>
        </>
      )}

      {open && <VideoModal id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
