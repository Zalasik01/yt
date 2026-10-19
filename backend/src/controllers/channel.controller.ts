import type { Request, Response } from 'express';
import { branding_service } from '../services/branding.service.js';
import { channel_assist_service } from '../services/channel-assist.service.js';
import { channel_service } from '../services/channel.service.js';
import { youtube_service } from '../services/youtube.service.js';

export const channel_controller = {
  async index(_req: Request, res: Response) {
    res.json({ data: await channel_service.list() });
  },

  async show(req: Request, res: Response) {
    res.json({ data: await channel_service.get(req.validated.params.id) });
  },

  async store(req: Request, res: Response) {
    res.status(201).json({ data: await channel_service.create(req.validated.body) });
  },

  async update(req: Request, res: Response) {
    res.json({ data: await channel_service.update(req.validated.params.id, req.validated.body) });
  },

  async destroy(req: Request, res: Response) {
    await channel_service.remove(req.validated.params.id);
    res.status(204).end();
  },

  async suggest(req: Request, res: Response) {
    const { field, ...context } = req.validated.body;
    res.json({ data: { suggestions: await channel_assist_service.suggest(field, context) } });
  },

  async generateBranding(req: Request, res: Response) {
    const { id, kind } = req.validated.params;
    await branding_service.generate(id, kind);
    res.json({ data: await channel_service.get(id) });
  },

  async youtubeAuthUrl(req: Request, res: Response) {
    res.json({ data: { url: await youtube_service.authUrl(req.validated.params.id) } });
  },

  async youtubeDisconnect(req: Request, res: Response) {
    await channel_service.disconnectYoutube(req.validated.params.id);
    res.status(204).end();
  },
};
