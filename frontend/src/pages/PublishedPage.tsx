import { useState } from 'react';
import { useVideos } from '../api/hooks';
import { VideoCard, VideoCardSkeleton } from '../components/VideoCard';
import { VideoModal } from '../components/VideoModal';

export function PublishedPage() {
  const { data: videos = [], isLoading } = useVideos({ status: ['published', 'rejected'], limit: 100 });
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Publicados</h1>
          <p className="page-sub">Histórico do que já foi ao ar (e do que foi reprovado).</p>
        </div>
      </div>
      {isLoading ? (
        <div className="cards">
          {Array.from({ length: 3 }, (_, index) => <VideoCardSkeleton key={index} />)}
        </div>
      ) : videos.length === 0 ? (
        <div className="empty">Nada publicado ainda.</div>
      ) : (
        <div className="cards">
          {videos.map((video, index) => (
            <VideoCard key={video.id} index={index} video={video} onOpen={setOpen} />
          ))}
        </div>
      )}
      {open && <VideoModal id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
