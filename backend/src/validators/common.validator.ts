import { z } from 'zod';

export const IdParams = z.object({ id: z.uuid() });

export const Pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});
