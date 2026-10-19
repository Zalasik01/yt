import type { Video } from '../api/types';
import { mediaUrl } from '../api/client';
import { formatDuration, formatDateTime, STATUS_LABELS } from '../lib/format';

interface Props {
  video: Video;
  onOpen: (id: string) => void;
  onApprove?: (id: string) => void;
  busy?: boolean;
}

export function VideoCard({ video, onOpen, onApprove, busy }: Props) {
  const done = (stage: string) => video.stages.find((item) => item.stage === stage)?.status === 'done';
  const checks = [
    { label: 'Áudio', ok: done('narracao') },
    { label: 'Cenas', ok: done('cenas') },
    { label: 'Legenda', ok: done('montagem') },
    { label: 'Capa', ok: done('thumbnail') },
  ];

  return (
    <article className="panel vcard">
      <div className="vcard-thumb" onClick={() => onOpen(video.id)} role="button" tabIndex={0}>
        {video.thumbnail_path ? <img src={mediaUrl(video.thumbnail_path)} alt="" loading="lazy" /> : null}
        <span className="play">▶</span>
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
              {check.ok ? '✓' : '·'} {check.label}
            </span>
          ))}
        </div>
        {video.error_message && <div className="error-text">{video.error_message}</div>}
        <div className="vcard-actions">
          {onApprove ? (
            <button className="btn btn-primary" disabled={busy} onClick={() => onApprove(video.id)}>
              ✓ Aprovar
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
  );
}
