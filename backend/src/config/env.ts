import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = (default_value: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(default_value)
    .transform((value) => value === 'true');

const env_schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PUBLIC_API_URL: z.string().url().default('http://localhost:3333'),
  WEB_APP_URL: z.string().url().default('http://localhost:5173'),
  API_KEY: z.string().optional(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default('media'),
  STORAGE_DRIVER: z.enum(['supabase', 'local']).default('supabase'),

  LLM_PROVIDER: z.enum(['anthropic', 'demo']).default('anthropic'),
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('claude-opus-5-5'),
  LLM_EFFORT: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('medium'),
  LLM_FALLBACKS: booleanFromString('true'),

  OPENAI_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  FAL_API_KEY: z.string().optional(),
  PEXELS_API_KEY: z.string().optional(),

  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),

  WORKER_ID: z.string().optional(),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(1),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(250).default(3000),
  WORK_DIR: z.string().default('./.work'),
  BACKGROUND_MUSIC_DIR: z.string().optional(),
  BACKGROUND_MUSIC_VOLUME: z.coerce.number().min(0).max(1).default(0.12),
  SUBTITLE_FONT: z.string().default('DejaVu Sans'),
  VIDEO_WIDTH: z.coerce.number().int().default(1920),
  VIDEO_HEIGHT: z.coerce.number().int().default(1080),
  VIDEO_FPS: z.coerce.number().int().default(30),
});

export type Env = z.infer<typeof env_schema>;

const parsed = env_schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:\n', z.prettifyError(parsed.error));
  process.exit(1);
}

export const env: Env = parsed.data;
