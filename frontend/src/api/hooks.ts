import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from './client';
import type { BrandingKind, Channel, ChannelInput, FactoryStatus, MetaOptions, PipelineStage, SuggestField, Video, VideoStatus } from './types';

export const keys = {
  factory: ['factory'] as const,
  meta: ['meta'] as const,
  channels: ['channels'] as const,
  videos: (filters: object) => ['videos', filters] as const,
  video: (id: string) => ['video', id] as const,
};

export function useFactoryStatus() {
  return useQuery({
    queryKey: keys.factory,
    queryFn: () => api.get<FactoryStatus>('/factory/status'),
    refetchInterval: 2500,
  });
}

export function useMeta() {
  return useQuery({ queryKey: keys.meta, queryFn: () => api.get<MetaOptions>('/meta/options'), staleTime: 60_000 });
}

export function useChannels() {
  return useQuery({ queryKey: keys.channels, queryFn: () => api.get<Channel[]>('/channels') });
}

export function useVideos(filters: { status?: VideoStatus[]; channel_id?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status?.length) params.set('status', filters.status.join(','));
  if (filters.channel_id) params.set('channel_id', filters.channel_id);
  params.set('limit', String(filters.limit ?? 50));
  return useQuery({
    queryKey: keys.videos(filters),
    queryFn: () => api.get<Video[]>(`/videos?${params.toString()}`),
    refetchInterval: 5000,
  });
}

export function useVideo(id: string | null) {
  return useQuery({
    queryKey: keys.video(id ?? ''),
    queryFn: () => api.get<Video>(`/videos/${id}`),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });
}

function useInvalidateAll() {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}

export function useCreateVideo() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: { channel_id: string; topic?: string }) => api.post<Video>('/videos', input),
    onSuccess: () => {
      toast.success('Pauta enviada para a fábrica');
      return invalidate();
    },
  });
}

const ACTION_MESSAGES = {
  approve: 'Vídeo aprovado e agendado',
  reject: 'Vídeo reprovado',
  revise: 'Correção enviada aos agentes',
  retry: 'Reprocessando a etapa que falhou',
} as const;

export function useVideoAction() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input:
      | { id: string; action: 'approve'; scheduled_at?: string }
      | { id: string; action: 'reject'; reason?: string }
      | { id: string; action: 'revise'; notes: string; from_stage: PipelineStage }
      | { id: string; action: 'retry' }) => {
      const { id, action, ...body } = input;
      return api.post<Video>(`/videos/${id}/${action}`, body);
    },
    onSuccess: (_video, input) => {
      toast.success(ACTION_MESSAGES[input.action]);
      return invalidate();
    },
  });
}

export function useDeleteVideo() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/videos/${id}`),
    onSuccess: () => {
      toast.success('Vídeo apagado');
      return invalidate();
    },
  });
}

export function useSaveChannel() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, ...input }: ChannelInput & { id?: string }) =>
      id ? api.patch<Channel>(`/channels/${id}`, input) : api.post<Channel>('/channels', input),
    onSuccess: (_channel, input) => {
      toast.success(input.id ? 'Canal salvo' : 'Canal criado');
      return invalidate();
    },
  });
}

export function useDeleteChannel() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/channels/${id}`),
    onSuccess: () => {
      toast.success('Canal apagado');
      return invalidate();
    },
  });
}

export function useYoutubeConnect() {
  return useMutation({
    mutationFn: (id: string) => api.get<{ url: string }>(`/channels/${id}/youtube/auth-url`),
    onSuccess: ({ url }) => window.location.assign(url),
  });
}

export function useYoutubeDisconnect() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/channels/${id}/youtube`),
    onSuccess: () => {
      toast.success('YouTube desconectado');
      return invalidate();
    },
  });
}

/** Sugestões da IA para nome, nicho e descrição do canal. */
export function useSuggest() {
  return useMutation({
    mutationFn: (input: { field: SuggestField; name?: string; niche?: string; description?: string; language?: string; tone?: string }) =>
      api.post<{ suggestions: string[] }>('/channels/ai/suggest', input).then((result) => result.suggestions),
  });
}

/** Gera foto de perfil ou banner do canal com o provedor de imagens configurado. */
export function useGenerateBranding() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: BrandingKind }) => api.post<Channel>(`/channels/${id}/branding/${kind}`),
    onSuccess: (_channel, { kind }) => {
      toast.success(kind === 'avatar' ? 'Foto de perfil gerada' : 'Banner gerado');
      return invalidate();
    },
  });
}

export function useClearLogs() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: () => api.delete('/factory/logs'),
    onSuccess: () => {
      toast.success('Console limpo');
      return invalidate();
    },
  });
}
