import { createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { youtube, type youtube_v3 } from '@googleapis/youtube';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { AppError, ProviderError, ValidationError } from '../../lib/errors.js';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

export interface UploadInput {
  refresh_token: string;
  file_path: string;
  title: string;
  description: string;
  tags: string[];
  publish_at: Date;
  category_id?: string;
  language?: string;
}

function redirectUri(): string {
  return `${env.PUBLIC_API_URL}/api/v1/youtube/callback`;
}

function oauthClient(): OAuth2Client {
  if (!env.YOUTUBE_CLIENT_ID || !env.YOUTUBE_CLIENT_SECRET) {
    throw new AppError('Configure YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET', 400, 'youtube_not_configured');
  }
  return new OAuth2Client({
    clientId: env.YOUTUBE_CLIENT_ID,
    clientSecret: env.YOUTUBE_CLIENT_SECRET,
    redirectUri: redirectUri(),
  });
}

function sign(value: string): string {
  return createHmac('sha256', env.SUPABASE_SERVICE_ROLE_KEY).update(value).digest('base64url');
}

export class YoutubeProvider {
  isConfigured(): boolean {
    return Boolean(env.YOUTUBE_CLIENT_ID && env.YOUTUBE_CLIENT_SECRET);
  }

  /** URL de consentimento; o state assinado amarra o retorno ao canal certo. */
  authUrl(channel_id: string): string {
    const state = `${channel_id}.${sign(channel_id)}`;
    return oauthClient().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES, state });
  }

  verifyState(state: string): string {
    const [channel_id, signature] = state.split('.');
    if (!channel_id || !signature) throw new ValidationError('state inválido');
    const expected = Buffer.from(sign(channel_id));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      throw new ValidationError('state inválido');
    }
    return channel_id;
  }

  async exchangeCode(code: string) {
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) throw new ProviderError('youtube', 'Google não retornou refresh_token');
    client.setCredentials(tokens);
    const api = youtube({ version: 'v3', auth: client });
    const { data } = await api.channels.list({ part: ['snippet'], mine: true });
    const channel = data.items?.[0];
    return {
      refresh_token: tokens.refresh_token,
      scopes: (tokens.scope ?? '').split(' ').filter(Boolean),
      youtube_channel_id: channel?.id ?? null,
      youtube_title: channel?.snippet?.title ?? null,
    };
  }

  private api(refresh_token: string): youtube_v3.Youtube {
    const client = oauthClient();
    client.setCredentials({ refresh_token });
    return youtube({ version: 'v3', auth: client });
  }

  /** Envia como privado com publishAt: o YouTube publica sozinho na data. */
  async uploadScheduled(input: UploadInput): Promise<string> {
    try {
      const { data } = await this.api(input.refresh_token).videos.insert({
        part: ['snippet', 'status'],
        notifySubscribers: true,
        requestBody: {
          snippet: {
            title: input.title.slice(0, 100),
            description: input.description.slice(0, 5000),
            tags: input.tags.slice(0, 30),
            categoryId: input.category_id ?? '24',
            defaultLanguage: input.language,
            defaultAudioLanguage: input.language,
          },
          status: {
            privacyStatus: 'private',
            publishAt: input.publish_at.toISOString(),
            selfDeclaredMadeForKids: false,
            // Conteúdo gerado/alterado por IA: divulgação exigida pela política do YouTube.
            containsSyntheticMedia: true,
          },
        },
        media: { body: createReadStream(input.file_path) },
      });
      if (!data.id) throw new ProviderError('youtube', 'Upload sem id de vídeo');
      return data.id;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new ProviderError('youtube', (error as Error).message);
    }
  }

  async setThumbnail(refresh_token: string, video_id: string, file_path: string): Promise<void> {
    try {
      await this.api(refresh_token).thumbnails.set({
        videoId: video_id,
        media: { mimeType: 'image/jpeg', body: createReadStream(file_path) },
      });
    } catch (error) {
      throw new ProviderError('youtube', `thumbnail: ${(error as Error).message}`);
    }
  }
}

export const youtube_provider = new YoutubeProvider();
