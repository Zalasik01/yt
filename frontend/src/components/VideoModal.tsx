import * as Dialog from '@radix-ui/react-dialog';
import { Check, RefreshCw, RotateCcw, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useDeleteVideo, useMeta, useVideo, useVideoAction } from '../api/hooks';
import { mediaUrl } from '../api/client';
import type { PipelineStage } from '../api/types';
import { formatDateTime, formatDuration, STATUS_LABELS } from '../lib/format';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Skeleton, SkeletonLines } from './ui/Skeleton';

type Tab = 'video' | 'cenas' | 'shorts';

export function VideoModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: video, isLoading } = useVideo(id);
  const { data: meta } = useMeta();
  const action = useVideoAction();
  const remove = useDeleteVideo();
  const [tab, setTab] = useState<Tab>('video');
  const [notes, setNotes] = useState('');
  const [from_stage, setFromStage] = useState<PipelineStage>('roteiro');
  const [scheduled_at, setScheduledAt] = useState('');
  const [confirm_delete, setConfirmDelete] = useState(false);

  const can_decide = video?.status === 'awaiting_approval';
  const can_revise = video ? !['scheduled', 'published', 'queued', 'in_production'].includes(video.status) : false;
  const run = (fn: () => Promise<unknown>, close = false) =>
    fn().then(() => close && onClose()).catch(() => undefined);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="panel dialog-content" aria-describedby={undefined}>
          {isLoading || !video ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Dialog.Title className="dialog-title">Carregando vídeo...</Dialog.Title>
              <Skeleton width={90} height={20} />
              <Skeleton width="70%" height={26} />
              <div className="grid-2">
                <Skeleton width="100%" height={260} radius={12} />
                <SkeletonLines lines={6} />
              </div>
            </div>
          ) : (
            <>
              <div className="modal-head">
                <div>
                  <span className="tag">{STATUS_LABELS[video.status]}</span>
                  <Dialog.Title asChild>
                    <h2>{video.title ?? video.topic ?? 'Sem título'}</h2>
                  </Dialog.Title>
                  <div className="muted">
                    {formatDuration(video.duration_seconds)} · {video.scenes?.length ?? 0} cenas · {video.shorts.length} shorts
                    {video.scheduled_at ? ` · agendado para ${formatDateTime(video.scheduled_at)}` : ''}
                    {video.youtube_video_id && (
                      <>
                        {' · '}
                        <a href={`https://youtu.be/${video.youtube_video_id}`} target="_blank" rel="noreferrer" className="link">
                          ver no YouTube
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <Dialog.Close asChild>
                  <button className="icon-btn" aria-label="Fechar"><X size={18} /></button>
                </Dialog.Close>
              </div>

              <div className="pipeline-steps">
                {video.stages.map((stage) => (
                  <span key={stage.stage} className={`step ${stage.status}`} title={stage.error ?? undefined}>
                    {meta?.stages.find((item) => item.stage === stage.stage)?.label ?? stage.stage}
                  </span>
                ))}
              </div>
              {video.error_message && <p className="error-text">{video.error_message}</p>}

              <div className="tabs">
                {(['video', 'cenas', 'shorts'] as Tab[]).map((name) => (
                  <button key={name} className={`tab ${tab === name ? 'active' : ''}`} onClick={() => setTab(name)}>
                    {name === 'video' ? 'Vídeo' : name === 'cenas' ? 'Roteiro & cenas' : 'Shorts'}
                  </button>
                ))}
              </div>

              {tab === 'video' && (
                <div className="grid-2">
                  <div>
                    {video.video_path ? (
                      <video className="main-video" src={mediaUrl(video.video_path)} poster={mediaUrl(video.thumbnail_path)} controls />
                    ) : (
                      <div className="empty">O vídeo ainda está sendo montado.</div>
                    )}
                    {video.thumbnail_path && (
                      <img src={mediaUrl(video.thumbnail_path)} alt="Thumbnail" style={{ width: '100%', borderRadius: 12, marginTop: 12 }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="field">
                      <span>Descrição</span>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{video.description ?? '—'}</div>
                    </div>
                    <div className="row">
                      {video.tags.map((tag) => (
                        <span key={tag} className="tag">#{tag}</span>
                      ))}
                    </div>
                    {video.revision_notes && (
                      <div className="field">
                        <span>Últimas notas de revisão</span>
                        <div className="muted">{video.revision_notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'cenas' && (
                <div className="scene-list">
                  {(video.scenes ?? []).map((scene) => (
                    <div key={scene.id} className="panel scene">
                      {scene.image_path ? <img src={mediaUrl(scene.image_path)} alt="" loading="lazy" /> : <div />}
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Cena {scene.position + 1} · {formatDuration(scene.duration_seconds)}
                        </div>
                        <div>{scene.narration_text}</div>
                        {scene.audio_path && <audio src={mediaUrl(scene.audio_path)} controls preload="none" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'shorts' && (
                <div className="shorts-row">
                  {video.shorts.map((short) => (
                    <div key={short.id} className="panel scard">
                      {short.video_path ? <video src={mediaUrl(short.video_path)} controls preload="metadata" /> : null}
                      <div className="scard-body">
                        <strong>{short.title}</strong>
                        <span className="muted">{formatDuration(short.end_seconds - short.start_seconds)}</span>
                      </div>
                    </div>
                  ))}
                  {video.shorts.length === 0 && <div className="empty">Nenhum short gerado.</div>}
                </div>
              )}

              <div className="tabs" />

              {can_decide && (
                <div className="row" style={{ marginBottom: 16 }}>
                  <button
                    className="btn btn-primary"
                    disabled={action.isPending}
                    onClick={() =>
                      run(
                        () =>
                          action.mutateAsync({
                            id: video.id,
                            action: 'approve',
                            scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : undefined,
                          }),
                        true,
                      )
                    }
                  >
                    <Check size={16} strokeWidth={3} /> Aprovar e agendar
                  </button>
                  <label className="field" style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <span>ou escolher data</span>
                    <input className="input" type="datetime-local" value={scheduled_at} onChange={(event) => setScheduledAt(event.target.value)} />
                  </label>
                </div>
              )}

              {can_revise && (
                <div className="grid-2">
                  <label className="field">
                    <span>Pedir correção</span>
                    <textarea
                      className="textarea"
                      placeholder="Ex.: o gancho está fraco, deixe mais misterioso; troque a cena 4..."
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label className="field">
                      <span>Refazer a partir de</span>
                      <select className="select" value={from_stage} onChange={(event) => setFromStage(event.target.value as PipelineStage)}>
                        {meta?.stages
                          .filter((stage) => stage.stage !== 'agenda')
                          .map((stage) => (
                            <option key={stage.stage} value={stage.stage}>
                              {stage.label}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      className="btn"
                      disabled={notes.trim().length < 3 || action.isPending}
                      onClick={() => run(() => action.mutateAsync({ id: video.id, action: 'revise', notes, from_stage }), true)}
                    >
                      <RotateCcw size={16} /> Mandar refazer
                    </button>
                  </div>
                </div>
              )}

              <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
                {video.status === 'failed' && (
                  <button className="btn" onClick={() => run(() => action.mutateAsync({ id: video.id, action: 'retry' }))}>
                    <RefreshCw size={16} /> Tentar de novo
                  </button>
                )}
                {can_decide && (
                  <button className="btn btn-danger" onClick={() => run(() => action.mutateAsync({ id: video.id, action: 'reject' }), true)}>
                    Reprovar
                  </button>
                )}
                <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={16} /> Apagar
                </button>
              </div>

              <ConfirmDialog
                open={confirm_delete}
                onOpenChange={setConfirmDelete}
                title="Apagar este vídeo?"
                description="O vídeo, as cenas, os shorts e todos os arquivos gerados serão removidos. Não dá para desfazer."
                confirmLabel="Apagar vídeo"
                destructive
                busy={remove.isPending}
                onConfirm={() => run(() => remove.mutateAsync(video.id), true)}
              />
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
