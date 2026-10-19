import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: 'route_not_found', message: `Rota ${req.method} ${req.path} não existe` } });
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    if (error.status_code >= 500) logger.error({ error, path: req.path }, error.message);
    res.status(error.status_code).json({ error: { code: error.code, message: error.message, details: error.details } });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: { code: 'invalid_json', message: 'JSON inválido' } });
    return;
  }
  logger.error({ error, path: req.path }, 'erro não tratado');
  res.status(500).json({ error: { code: 'internal_error', message: 'Erro interno' } });
}
