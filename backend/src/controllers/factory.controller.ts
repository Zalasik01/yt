import type { Request, Response } from 'express';
import { factory_service } from '../services/factory.service.js';

export const factory_controller = {
  async status(_req: Request, res: Response) {
    res.json({ data: await factory_service.status() });
  },

  async logs(req: Request, res: Response) {
    res.json({ data: await factory_service.logs(req.validated.query) });
  },
};
