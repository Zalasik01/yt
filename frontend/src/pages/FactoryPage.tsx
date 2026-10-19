import { Copy, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useChannels, useClearLogs, useCreateVideo, useFactoryStatus } from '../api/hooks';
import { PixelDesk, PixelLounge, PixelPlant } from '../components/PixelDesk';
import { Skeleton, SkeletonLines } from '../components/ui/Skeleton';
import { Tip } from '../components/ui/Tip';
import { copyText } from '../lib/clipboard';
import { STAGE_COLORS } from '../lib/format';
import '../styles/factory.css';

const STATE_TEXT = { idle: 'livre', working: 'trabalhando', done: 'pronto', waiting: 'esperando', error: 'erro' };

export function FactoryPage() {
  const { data: factory, isLoading } = useFactoryStatus();
  const { data: channels, isLoading: loading_channels } = useChannels();
  const create = useCreateVideo();
  const clear_logs = useClearLogs();
  const [topic, setTopic] = useState('');
  const [channel_id, setChannelId] = useState('');
  const terminal = useRef<HTMLDivElement>(null);

  const selected_channel = channel_id || channels?.[0]?.id || '';
  const waiting = (factory?.counts.awaiting_approval ?? 0) > 0;
  const logs = [...(factory?.logs ?? [])].reverse();

  useEffect(() => {
    terminal.current?.scrollTo({ top: terminal.current.scrollHeight, behavior: 'smooth' });
  }, [factory?.logs[0]?.id]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected_channel) return;
    create.mutate({ channel_id: selected_channel, topic: topic.trim() || undefined }, { onSuccess: () => setTopic('') });
  };

  const copyConsole = () => {
    const text = logs
      .map((log) => `[${new Date(log.created_at).toLocaleTimeString('pt-BR')}] [${log.stage ?? 'fábrica'}] ${log.message}`)
      .join('\n');
    return copyText(text, 'Console copiado');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Fábrica</h1>
          <p className="page-sub">Pauta, roteiro, narração, cenas, montagem, shorts, thumbnail e agenda — no automático.</p>
        </div>
      </div>

      {loading_channels ? (
        <div className="new-pauta">
          <Skeleton height={42} radius={10} style={{ flex: 1, minWidth: 220 }} />
          <Skeleton width={130} height={42} radius={10} />
        </div>
      ) : channels && channels.length === 0 ? (
        <div className="empty" style={{ marginBottom: 18 }}>
          Crie seu primeiro canal em <Link to="/canais" className="link">Canais</Link> para ligar a fábrica.
        </div>
      ) : (
        <form className="new-pauta" onSubmit={submit}>
          {channels && channels.length > 1 && (
            <select className="select" value={selected_channel} onChange={(event) => setChannelId(event.target.value)}>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          )}
          <input
            className="input"
            placeholder="Sugira um tema (ou deixe vazio para o agente de pauta escolher)"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          />
          <button className="btn btn-primary" disabled={create.isPending || !selected_channel}>
            {create.isPending ? <Loader2 size={16} className="spin" /> : <Plus size={16} strokeWidth={3} />} Nova pauta
          </button>
        </form>
      )}

      <div className="factory">
        <section className="panel office">
          <div className="office-wall">
            <div className="wall-window">
              {[[12, 10], [40, 22], [70, 8], [95, 30], [25, 36], [85, 14]].map(([x, y]) => (
                <i key={`${x}-${y}`} style={{ left: x, top: y }} />
              ))}
            </div>
            <div className="wall-board">
              {Object.values(STAGE_COLORS).slice(0, 6).map((color) => (
                <b key={color} style={{ background: color }} />
              ))}
            </div>
            <div className="wall-clock" />
            <div className="coffee" />
          </div>

          <div className="floor">
            {isLoading
              ? Array.from({ length: 8 }, (_, index) => (
                  <div key={index} className="desk" style={{ gap: 10 }}>
                    <Skeleton width="80%" height={84} radius={10} />
                    <Skeleton width={70} height={12} />
                  </div>
                ))
              : factory?.agents.map((agent) => <PixelDesk key={agent.stage} agent={agent} />)}
          </div>

          <div className="lounge">
            <PixelPlant />
            <PixelLounge waiting={waiting} />
            <PixelPlant />
          </div>
        </section>

        <aside className="panel status-panel">
          <div>
            <div className="status-kicker">ESTADO REAL · {factory?.queued_jobs ?? 0} NA FILA</div>
            <div className="now-card" style={{ marginTop: 8 }}>
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Skeleton width={110} height={12} />
                  <Skeleton width="90%" height={16} />
                  <Skeleton width="100%" height={10} />
                </div>
              ) : factory?.active_video ? (
                <>
                  <div className="muted" style={{ fontSize: 12 }}>Produzindo agora</div>
                  <div className="now-title">{factory.active_video.title ?? 'Definindo pauta...'}</div>
                  <div className="progress">
                    <div style={{ width: `${factory.active_video.progress}%` }} />
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{factory.active_video.progress}% concluído</div>
                </>
              ) : (
                <div className="muted">Nenhum vídeo em produção. Mande uma pauta!</div>
              )}
            </div>
          </div>

          <div className="agent-list">
            <div className="status-kicker">AGENTES</div>
            <ul>
              {isLoading
                ? Array.from({ length: 8 }, (_, index) => (
                    <li key={index}>
                      <Skeleton width={110} height={13} />
                      <Skeleton width={64} height={20} />
                    </li>
                  ))
                : factory?.agents.map((agent) => (
                    <li key={agent.stage}>
                      <span>
                        <i className="dot" style={{ background: STAGE_COLORS[agent.stage] }} />
                        {agent.label}
                      </span>
                      <span className={`tag ${agent.state === 'done' ? 'tag-ok' : agent.state === 'error' ? 'tag-err' : agent.state === 'idle' ? '' : 'tag-warn'}`}>
                        {STATE_TEXT[agent.state]}
                      </span>
                    </li>
                  ))}
            </ul>
          </div>

          <div>
            <div className="console-head">
              <div className="status-kicker">CONSOLE</div>
              <div className="console-actions">
                <Tip label="Copiar console">
                  <button className="icon-btn" onClick={copyConsole} disabled={logs.length === 0} aria-label="Copiar console">
                    <Copy size={16} />
                  </button>
                </Tip>
                <Tip label="Limpar console">
                  <button className="icon-btn" onClick={() => clear_logs.mutate()} disabled={logs.length === 0 || clear_logs.isPending} aria-label="Limpar console">
                    {clear_logs.isPending ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                  </button>
                </Tip>
              </div>
            </div>
            <div className="terminal" ref={terminal}>
              {isLoading ? (
                <SkeletonLines lines={6} gap={10} />
              ) : logs.length === 0 ? (
                <div className="empty-log">Nenhuma mensagem ainda.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className={log.level}>
                    <span className="muted">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</span>{' '}
                    <span className="stage">[{log.stage ?? 'fábrica'}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
