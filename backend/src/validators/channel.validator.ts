import { z } from 'zod';
import { IMAGE_PROVIDERS } from '../providers/image/index.js';
import { TTS_PROVIDERS } from '../providers/tts/index.js';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');

const isValidTimeZone = (value: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const ChannelFields = z.object({
  name: z.string().trim().min(2).max(80),
  niche: z.string().trim().min(3).max(300),
  description: z.string().trim().max(2000).nullable(),
  language: z.string().min(2).max(10),
  tone: z.string().max(300),
  target_duration_minutes: z.number().int().min(1).max(60),
  shorts_per_video: z.number().int().min(0).max(10),
  tts_provider: z.enum(TTS_PROVIDERS as [string, ...string[]]),
  tts_voice: z.string().min(1).max(100),
  image_provider: z.enum(IMAGE_PROVIDERS as [string, ...string[]]),
  image_style: z.string().max(500),
  publish_timezone: z.string().refine(isValidTimeZone, 'Fuso horário inválido'),
  publish_days: z.array(z.number().int().min(0).max(6)).min(1),
  publish_times: z.array(time).min(1),
  auto_produce: z.boolean(),
  is_active: z.boolean(),
});

export const CreateChannelBody = ChannelFields.partial().required({ name: true, niche: true });
export const UpdateChannelBody = ChannelFields.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Informe ao menos um campo',
});

export const AiSuggestBody = z.object({
  field: z.enum(['name', 'niche', 'description']),
  name: z.string().trim().max(80).optional(),
  niche: z.string().trim().max(300).optional(),
  description: z.string().trim().max(2000).optional(),
  language: z.string().max(10).optional(),
  tone: z.string().max(300).optional(),
});

export const BrandingParams = z.object({ id: z.uuid(), kind: z.enum(['avatar', 'banner']) });

export type CreateChannelInput = z.infer<typeof CreateChannelBody>;
export type UpdateChannelInput = z.infer<typeof UpdateChannelBody>;
