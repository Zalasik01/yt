import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { youtube_service } from '../services/youtube.service.js';

export const youtube_controller = {
  /** Retorno do OAuth do Google — redireciona de volta para o painel. */
  async callback(req: Request, res: Response) {
    const { code, state, error } = req.query as Record<string, string | undefined>;
    const back = new URL('/canais', env.WEB_APP_URL);
    if (error || !code || !state) {
      back.searchParams.set('youtube', 'erro');
      res.redirect(back.toString());
      return;
    }
    try {
      const channel_id = await youtube_service.handleCallback(code, state);
      back.searchParams.set('youtube', 'conectado');
      back.searchParams.set('channel_id', channel_id);
    } catch (err) {
      logger.error({ err }, 'falha no callback do YouTube');
      back.searchParams.set('youtube', 'erro');
    }
    res.redirect(back.toString());
  },
};
