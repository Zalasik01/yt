import { ImagePlus, Info, Loader2, Plus, Save, Trash2, Tv2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  useChannels,
  useDeleteChannel,
  useGenerateBranding,
  useMeta,
  useSaveChannel,
  useYoutubeConnect,
  useYoutubeDisconnect,
} from '../api/hooks';
import { mediaUrl } from '../api/client';
import type { Channel, ChannelInput } from '../api/types';
import { AiSuggest } from '../components/ui/AiSuggest';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FadeIn } from '../components/ui/motion';
import { Skeleton } from '../components/ui/Skeleton';
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

function Branding({ channel }: { channel: Channel }) {
  const generate = useGenerateBranding();
  const busy = (kind: 'avatar' | 'banner') => generate.isPending && generate.variables?.kind === kind;
  const avatar = mediaUrl(channel.avatar_path);
  const banner = mediaUrl(channel.banner_path);

  return (
    <div className="branding">
      <div className="brand-col center">
        <div className="field"><span>Foto de perfil</span></div>
        <div className="avatar-preview">
          {busy('avatar') ? <Skeleton width="100%" height="100%" radius={0} /> : avatar ? <img src={avatar} alt="Foto de perfil" /> : <User size={48} />}
        </div>
        <button type="button" className="btn btn-ai btn-sm" disabled={generate.isPending} onClick={() => generate.mutate({ id: channel.id, kind: 'avatar' })}>
          {busy('avatar') ? <Loader2 size={14} className="spin" /> : <ImagePlus size={14} />}
          {avatar ? 'Gerar outra' : 'Gerar foto'}
        </button>
      </div>
      <div className="brand-col" style={{ width: '100%' }}>
        <div className="field"><span>Banner (2560×1440)</span></div>
        <div className="banner-preview">
          {busy('banner') ? <Skeleton width="100%" height="100%" radius={0} /> : banner ? <img src={banner} alt="Banner do canal" /> : <ImagePlus size={40} />}
        </div>
        <button type="button" className="btn btn-ai btn-sm" disabled={generate.isPending} onClick={() => generate.mutate({ id: channel.id, kind: 'banner' })}>
          {busy('banner') ? <Loader2 size={14} className="spin" /> : <ImagePlus size={14} />}
          {banner ? 'Gerar outro' : 'Gerar banner'}
        </button>
      </div>
    </div>
  );
}

function ChannelForm({ channel, index = 0, onDone }: { channel?: Channel; index?: number; onDone?: () => void }) {
  const { data: meta } = useMeta();
  const save = useSaveChannel();
  const remove = useDeleteChannel();
  const connect = useYoutubeConnect();
  const disconnect = useYoutubeDisconnect();
  const [form, setForm] = useState<ChannelInput>(() => {
    if (!channel) return DEFAULTS;
    const { id: _id, youtube: _youtube, avatar_path: _avatar, banner_path: _banner, ...rest } = channel;
    return rest;
  });
  const [times_text, setTimesText] = useState((form.publish_times ?? []).join(', '));
  const [confirm_delete, setConfirmDelete] = useState(false);

  const set = <K extends keyof ChannelInput>(key: K, value: ChannelInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleDay = (day: number) => {
    const days = new Set(form.publish_days);
    days.has(day) ? days.delete(day) : days.add(day);
    set('publish_days', [...days].sort());
  };
  const ai_context = { name: form.name, niche: form.niche, description: form.description ?? '', language: form.language, tone: form.tone };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const publish_times = times_text.split(/[,\s]+/).filter(Boolean);
    const payload = { ...form, publish_times, description: form.description || null };
    save.mutate(channel ? { id: channel.id, ...payload } : payload, { onSuccess: () => onDone?.() });
  };

  return (
    <FadeIn index={index}>
      <form className="panel channel-card" onSubmit={submit}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="channel-head">
            {channel?.avatar_path ? (
              <img className="channel-avatar" src={mediaUrl(channel.avatar_path)} alt="" />
            ) : (
              <span className="channel-avatar" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)' }}><Tv2 size={20} /></span>
            )}
            <h2 className="section-title" style={{ margin: 0 }}>{channel ? channel.name : 'Novo canal'}</h2>
          </div>
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
          <div className="field">
            <div className="label-row">
              <span>Nome</span>
              <AiSuggest field="name" label="Gerar nome" title="Nomes sugeridos" context={ai_context} onPick={(value) => set('name', value)} />
            </div>
            <input className="input" required value={form.name ?? ''} onChange={(event) => set('name', event.target.value)} />
          </div>
          <div className="field">
            <div className="label-row">
              <span>Nicho</span>
              <AiSuggest field="niche" label="Sugerir nicho" title="Nichos sugeridos" context={ai_context} onPick={(value) => set('niche', value)} />
            </div>
            <input
              className="input"
              required
              placeholder="ex.: mistérios históricos não resolvidos"
              value={form.niche ?? ''}
              onChange={(event) => set('niche', event.target.value)}
            />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <div className="label-row">
              <span>Descrição / público</span>
              <AiSuggest
                field="description"
                label={form.description ? 'Melhorar com IA' : 'Gerar com IA'}
                title="Descrição sugerida"
                context={ai_context}
                onPick={(value) => set('description', value)}
              />
            </div>
            <textarea className="textarea" value={form.description ?? ''} onChange={(event) => set('description', event.target.value)} />
          </div>
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
          {form.image_provider === 'placeholder' && (
            <div className="notice" style={{ gridColumn: '1 / -1' }}>
              <Info size={16} />
              <span>
                Com <strong>placeholder</strong> os vídeos saem só com fundo escuro e legenda, sem imagens. Para ter cenas de verdade, escolha{' '}
                <strong>pexels</strong> (grátis, precisa de PEXELS_API_KEY), <strong>fal</strong> ou <strong>openai</strong>.
              </span>
            </div>
          )}
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

        <h3 className="section-title" style={{ marginTop: 24 }}>Identidade visual</h3>
        {channel ? (
          <Branding channel={channel} />
        ) : (
          <div className="notice"><Info size={16} /><span>Crie o canal primeiro; depois você gera a foto de perfil e o banner aqui.</span></div>
        )}

        <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
          {channel && (
            <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> Apagar canal
            </button>
          )}
          <button className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? <Loader2 size={16} className="spin" /> : channel ? <Save size={16} /> : <Plus size={16} strokeWidth={3} />}
            {channel ? 'Salvar' : 'Criar canal'}
          </button>
        </div>

        {channel && (
          <ConfirmDialog
            open={confirm_delete}
            onOpenChange={setConfirmDelete}
            title={`Apagar o canal ${channel.name}?`}
            description="Todos os vídeos, shorts e arquivos deste canal serão apagados. Não dá para desfazer."
            confirmLabel="Apagar canal"
            destructive
            busy={remove.isPending}
            onConfirm={() => remove.mutate(channel.id, { onSettled: () => setConfirmDelete(false) })}
          />
        )}
      </form>
    </FadeIn>
  );
}

function ChannelFormSkeleton() {
  return (
    <div className="panel channel-card">
      <div className="row" style={{ marginBottom: 18 }}>
        <Skeleton width={44} height={44} radius="50%" />
        <Skeleton width={180} height={22} />
      </div>
      <div className="grid-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="field">
            <Skeleton width={90} height={11} />
            <Skeleton width="100%" height={42} radius={10} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChannelsPage() {
  const { data: channels = [], isLoading } = useChannels();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const youtube_result = params.get('youtube');

  useEffect(() => {
    if (!youtube_result) return;
    if (youtube_result === 'conectado') toast.success('YouTube conectado!');
    else toast.error('Não foi possível conectar o YouTube.');
    setParams({}, { replace: true });
  }, [youtube_result, setParams]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Canais</h1>
          <p className="page-sub">Nicho, voz, estilo visual e calendário de cada canal.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} strokeWidth={3} /> Novo canal
        </button>
      </div>
      {isLoading && <ChannelFormSkeleton />}
      {(creating || (!isLoading && channels.length === 0)) && <ChannelForm onDone={() => setCreating(false)} />}
      {channels.map((channel, index) => (
        <ChannelForm key={channel.id} channel={channel} index={index} />
      ))}
    </>
  );
}
