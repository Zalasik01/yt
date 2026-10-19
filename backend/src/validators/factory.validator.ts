import { z } from 'zod';

export const LogsQuery = z.object({
  video_id: z.uuid().optional(),
  after_id: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const MediaQuery = z.object({
  path: z.string().regex(/^videos\/[0-9a-f-]{36}\/[\w./-]+$/, 'Caminho inválido').refine((value) => !value.includes('..')),
});
