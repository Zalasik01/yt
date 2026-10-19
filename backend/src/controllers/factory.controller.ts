import type { Request, Response } from 'express';
import { agent_log_model } from '../models/agent-log.model.js';
import { factory_service } from '../services/factory.service.js';

export const factory_controller = {
  async status(_req: Request, res: Response) {
    res.json({ data: await factory_service.status() });
  },

  async logs(req: Request, res: Response) {
    res.json({ data: await factory_service.logs(req.validated.query) });
  },

  async clearLogs(_req: Request, res: Response) {
    await agent_log_model.clear();
    res.status(204).end();
  },
};
