import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChannels, useDeleteChannel, useMeta, useSaveChannel, useYoutubeConnect, useYoutubeDisconnect } from '../api/hooks';
import type { Channel, ChannelInput } from '../api/types';
import { WEEKDAYS } from '../lib/format';

const DEFAULTS: ChannelInput = {
  name: '',
  niche: '',
  description: '',
  language: 'pt-BR',
  tone: 'misterioso, envolvente, narrativo',
  target_duration_minutes: 8,
  shorts_per_video: 3,
  tts_provider: 'edge',
  tts_voice: 'pt-BR-AntonioNeural',
  image_provider: 'placeholder',
  image_style: 'cinematic, dark, moody lighting, high detail, 16:9',
  publish_timezone: 'America/Sao_Paulo',
  publish_days: [0, 1, 2, 3, 4, 5, 6],
  publish_times: ['18:00'],
  auto_produce: false,
  is_active: true,
};

const VOICE_HINTS: Record<string, string> = {
  edge: 'Grátis. Ex.: pt-BR-AntonioNeural, pt-BR-FranciscaNeural, pt-BR-ThalitaMultilingualNeural',
  elevenlabs: 'Use o voice_id da sua conta ElevenLabs',
  openai: 'Ex.: onyx, alloy, echo, nova, sage',
};

function ChannelForm({ channel, onDone }: { channel?: Channel; onDone?: () => void }) {
  const { data: meta } = useMeta();
  const save = useSaveChannel();
  const remove = useDeleteChannel();
  const connect = useYoutubeConnect();
  const disconnect = useYoutubeDisconnect();
  const [form, setForm] = useState<ChannelInput>(() => {
    if (!channel) return DEFAULTS;
    const { id: _id, youtube: _youtube, ...rest } = channel;
    return rest;
  });
  const [times_text, setTimesText] = useState((form.publish_times ?? []).join(', '));
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof ChannelInput>(key: K, value: ChannelInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleDay = (day: number) => {
    const days = new Set(form.publish_days);
    days.has(day) ? days.delete(day) : days.add(day);
    set('publish_days', [...days].sort());
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const publish_times = times_text.split(/[,\s]+/).filter(Boolean);
    const payload = { ...form, publish_times, description: form.description || null };
    save.mutate(channel ? { id: channel.id, ...payload } : payload, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onDone?.();
      },
    });
  };

  return (
    <form className="panel channel-card" onSubmit={submit}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>{channel ? channel.name : 'Novo canal'}</h2>
        {channel && (
          <div className="row">
            {channel.youtube.connected ? (
              <>
                <span className="tag tag-ok">YouTube: {channel.youtube.title ?? 'conectado'}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => disconnect.mutate(channel.id)}>
                  Desconectar
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-sm"
                disabled={!channel.youtube.configured || connect.isPending}
                title={channel.youtube.configured ? undefined : 'Configure YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET no backend'}
                onClick={() => connect.mutate(channel.id)}
              >
                Conectar YouTube
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid-2">
        <label className="field">
          <span>Nome</span>
          <input className="input" required value={form.name ?? ''} onChange={(event) => set('name', event.target.value)} />
        </label>
        <label className="field">
          <span>Nicho</span>
          <input
            className="input"
            required
            placeholder="ex.: mistérios históricos não resolvidos"
            value={form.niche ?? ''}
            onChange={(event) => set('niche', event.target.value)}
          />
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          <span>Descrição / público</span>
          <textarea className="textarea" value={form.description ?? ''} onChange={(event) => set('description', event.target.value)} />
        </label>
        <label className="field">
          <span>Tom de voz</span>
          <input className="input" value={form.tone ?? ''} onChange={(event) => set('tone', event.target.value)} />
        </label>
        <label className="field">
          <span>Idioma</span>
          <input className="input" value={form.language ?? ''} onChange={(event) => set('language', event.target.value)} />
        </label>
        <label className="field">
          <span>Duração alvo (min)</span>
          <input
            className="input"
            type="number"
            min={1}
            max={60}
            value={form.target_duration_minutes}
            onChange={(event) => set('target_duration_minutes', Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Shorts por vídeo</span>
          <input
            className="input"
            type="number"
            min={0}
            max={10}
            value={form.shorts_per_video}
            onChange={(event) => set('shorts_per_video', Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Voz (provedor)</span>
          <select className="select" value={form.tts_provider} onChange={(event) => set('tts_provider', event.target.value)}>
            {meta?.tts_providers.map((provider) => <option key={provider}>{provider}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Voz</span>
          <input className="input" value={form.tts_voice ?? ''} onChange={(event) => set('tts_voice', event.target.value)} />
          <small>{VOICE_HINTS[form.tts_provider ?? ''] ?? ''}</small>
        </label>
        <label className="field">
          <span>Imagens (provedor)</span>
          <select className="select" value={form.image_provider} onChange={(event) => set('image_provider', event.target.value)}>
            {meta?.image_providers.map((provider) => <option key={provider}>{provider}</option>)}
          </select>
          <small>placeholder = fundo escuro para testes; openai/fal = IA; pexels = banco de fotos grátis</small>
        </label>
        <label className="field">
          <span>Estilo visual</span>
          <input className="input" value={form.image_style ?? ''} onChange={(event) => set('image_style', event.target.value)} />
        </label>
        <div className="field">
          <span>Dias de publicação</span>
          <div className="days">
            {WEEKDAYS.map((label, day) => (
              <button type="button" key={label} className={`day ${form.publish_days?.includes(day) ? 'on' : ''}`} onClick={() => toggleDay(day)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-2">
          <label className="field">
            <span>Horários</span>
            <input className="input" value={times_text} onChange={(event) => setTimesText(event.target.value)} placeholder="18:00, 12:00" />
          </label>
          <label className="field">
            <span>Fuso</span>
            <input className="input" value={form.publish_timezone ?? ''} onChange={(event) => set('publish_timezone', event.target.value)} />
          </label>
        </div>
        <label className="switch">
          <input type="checkbox" checked={form.auto_produce} onChange={(event) => set('auto_produce', event.target.checked)} />
          Produção automática (mantém sempre 2 vídeos no forno)
        </label>
        <label className="switch">
          <input type="checkbox" checked={form.is_active} onChange={(event) => set('is_active', event.target.checked)} />
          Canal ativo
        </label>
      </div>

      <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
        {save.error && <span className="error-text">{save.error.message}</span>}
        {saved && <span className="tag tag-ok">salvo</span>}
        {channel && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => window.confirm(`Apagar o canal ${channel.name} e todos os vídeos?`) && remove.mutate(channel.id)}
          >
            Apagar canal
          </button>
        )}
        <button className="btn btn-primary" disabled={save.isPending}>
          {channel ? 'Salvar' : 'Criar canal'}
        </button>
      </div>
    </form>
  );
}

export function ChannelsPage() {
  const { data: channels = [], isLoading } = useChannels();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const youtube_result = params.get('youtube');

  useEffect(() => {
    if (!youtube_result) return;
    const timeout = setTimeout(() => setParams({}), 5000);
    return () => clearTimeout(timeout);
  }, [youtube_result, setParams]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Canais</h1>
          <p className="page-sub">Nicho, voz, estilo visual e calendário de cada canal.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Novo canal</button>
      </div>
      {youtube_result && (
        <div className={`panel toast`}>
          {youtube_result === 'conectado' ? '✓ YouTube conectado!' : 'Não foi possível conectar o YouTube.'}
        </div>
      )}
      {(creating || (!isLoading && channels.length === 0)) && <ChannelForm onDone={() => setCreating(false)} />}
      {channels.map((channel) => (
        <ChannelForm key={channel.id} channel={channel} />
      ))}
    </>
  );
}
