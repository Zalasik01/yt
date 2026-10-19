import { Check, Play } from 'lucide-react';
import type { Video } from '../api/types';
import { mediaUrl } from '../api/client';
import { formatDuration, formatDateTime, STATUS_LABELS } from '../lib/format';
import { FadeIn } from './ui/motion';
import { Skeleton } from './ui/Skeleton';

interface Props {
  video: Video;
  onOpen: (id: string) => void;
  onApprove?: (id: string) => void;
  busy?: boolean;
  index?: number;
}

export function VideoCard({ video, onOpen, onApprove, busy, index = 0 }: Props) {
  const done = (stage: string) => video.stages.find((item) => item.stage === stage)?.status === 'done';
  const checks = [
    { label: 'Áudio', ok: done('narracao') },
    { label: 'Cenas', ok: done('cenas') },
    { label: 'Legenda', ok: done('montagem') },
    { label: 'Capa', ok: done('thumbnail') },
  ];

  return (
    <FadeIn index={index} style={{ display: 'flex' }}>
      <article className="panel vcard" style={{ flex: 1 }}>
        <div className="vcard-thumb" onClick={() => onOpen(video.id)} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onOpen(video.id)}>
          {video.thumbnail_path ? <img src={mediaUrl(video.thumbnail_path)} alt="" loading="lazy" /> : null}
          <span className="play"><Play size={20} fill="currentColor" /></span>
          <span className="vcard-duration">{formatDuration(video.duration_seconds)}</span>
        </div>
        <div className="vcard-body">
          <span className="tag">{STATUS_LABELS[video.status]}</span>
          <h3 className="vcard-title">{video.title ?? video.topic ?? 'Pauta em definição...'}</h3>
          <div className="vcard-meta">
            {video.shorts.length} shorts
            {video.scheduled_at ? ` · ${formatDateTime(video.scheduled_at)}` : ''}
          </div>
          <div className="vcard-checks">
            {checks.map((check) => (
              <span key={check.label} className={`tag ${check.ok ? 'tag-ok' : ''}`}>
                {check.ok ? <Check size={11} strokeWidth={3} /> : '·'} {check.label}
              </span>
            ))}
          </div>
          {video.error_message && <div className="error-text">{video.error_message}</div>}
          <div className="vcard-actions">
            {onApprove ? (
              <button className="btn btn-primary" disabled={busy} onClick={() => onApprove(video.id)}>
                <Check size={16} strokeWidth={3} /> Aprovar
              </button>
            ) : (
              <span />
            )}
            <button className="btn btn-ghost" onClick={() => onOpen(video.id)}>
              Revisar
            </button>
          </div>
        </div>
      </article>
    </FadeIn>
  );
}

export function VideoCardSkeleton() {
  return (
    <article className="panel vcard">
      <div className="vcard-thumb" />
      <div className="vcard-body">
        <Skeleton width={90} height={18} />
        <Skeleton width="90%" height={18} />
        <Skeleton width="55%" />
        <div className="vcard-checks">
          <Skeleton width={60} height={20} />
          <Skeleton width={60} height={20} />
          <Skeleton width={70} height={20} />
        </div>
        <div className="vcard-actions">
          <Skeleton height={40} radius={10} />
          <Skeleton width={84} height={40} radius={10} />
        </div>
      </div>
    </article>
  );
}
