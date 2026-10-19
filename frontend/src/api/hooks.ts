import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Channel, ChannelInput, FactoryStatus, MetaOptions, PipelineStage, Video, VideoStatus } from './types';

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
    onSuccess: invalidate,
  });
}

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
    onSuccess: invalidate,
  });
}

export function useDeleteVideo() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => api.delete(`/videos/${id}`), onSuccess: invalidate });
}

export function useSaveChannel() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, ...input }: ChannelInput & { id?: string }) =>
      id ? api.patch<Channel>(`/channels/${id}`, input) : api.post<Channel>('/channels', input),
    onSuccess: invalidate,
  });
}

export function useDeleteChannel() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => api.delete(`/channels/${id}`), onSuccess: invalidate });
}

export function useYoutubeConnect() {
  return useMutation({
    mutationFn: (id: string) => api.get<{ url: string }>(`/channels/${id}/youtube/auth-url`),
    onSuccess: ({ url }) => window.location.assign(url),
  });
}

export function useYoutubeDisconnect() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => api.delete(`/channels/${id}/youtube`), onSuccess: invalidate });
}
