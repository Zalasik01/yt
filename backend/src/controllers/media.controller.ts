import type { Request, Response } from 'express';
import { storage } from '../lib/storage/index.js';

export const media_controller = {
  /** Entrega áudio/imagem/vídeo: redireciona p/ URL assinada ou serve o arquivo local (com Range). */
  async show(req: Request, res: Response) {
    const target = await storage.resolve(req.validated.query.path);
    if (target.type === 'redirect') {
      res.redirect(302, target.url);
      return;
    }
    res.sendFile(target.path, { maxAge: '1h' });
  },
};
