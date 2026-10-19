import { z } from 'zod';
import { PIPELINE_STAGES } from '../models/pipeline.js';
import { Pagination } from './common.validator.js';

const VIDEO_STATUSES = [
  'queued',
  'in_production',
  'awaiting_approval',
  'approved',
  'scheduled',
  'published',
  'rejected',
  'failed',
] as const;

export const ListVideosQuery = Pagination.extend({
  channel_id: z.uuid().optional(),
  status: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',') : undefined))
    .pipe(z.array(z.enum(VIDEO_STATUSES)).optional()),
});

export const CreateVideoBody = z.object({
  channel_id: z.uuid(),
  topic: z.string().trim().max(500).nullish(),
});

export const ApproveVideoBody = z.object({
  scheduled_at: z.iso
    .datetime({ offset: true })
    .refine((value) => new Date(value).getTime() > Date.now() + 15 * 60_000, 'Agende com pelo menos 15 minutos de antecedência')
    .optional(),
});

export const RejectVideoBody = z.object({ reason: z.string().trim().max(2000).optional() });

export const ReviseVideoBody = z.object({
  notes: z.string().trim().min(3).max(4000),
  from_stage: z.enum(PIPELINE_STAGES.filter((stage) => stage !== 'agenda') as [string, ...string[]]).default('roteiro'),
});

export type ListVideosInput = z.infer<typeof ListVideosQuery>;
