import type { Request, Response } from 'express';
import { video_service } from '../services/video.service.js';
import type { ListVideosInput } from '../validators/video.validator.js';

export const video_controller = {
  async index(req: Request, res: Response) {
    const query = req.validated.query as ListVideosInput;
    const data = await video_service.list(query);
    res.json({ data, meta: { limit: query.limit, offset: query.offset } });
  },

  async show(req: Request, res: Response) {
    res.json({ data: await video_service.get(req.validated.params.id) });
  },

  async store(req: Request, res: Response) {
    res.status(201).json({ data: await video_service.create(req.validated.body) });
  },

  async approve(req: Request, res: Response) {
    res.json({ data: await video_service.approve(req.validated.params.id, req.validated.body.scheduled_at) });
  },

  async reject(req: Request, res: Response) {
    res.json({ data: await video_service.reject(req.validated.params.id, req.validated.body.reason) });
  },

  async revise(req: Request, res: Response) {
    const { notes, from_stage } = req.validated.body;
    res.json({ data: await video_service.revise(req.validated.params.id, notes, from_stage) });
  },

  async retry(req: Request, res: Response) {
    res.json({ data: await video_service.retry(req.validated.params.id) });
  },

  async destroy(req: Request, res: Response) {
    await video_service.remove(req.validated.params.id);
    res.status(204).end();
  },
};
