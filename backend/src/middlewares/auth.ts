import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Autenticação simples por chave (header x-api-key ou ?api_key= para <video src>).
 * Se API_KEY não estiver definida, a API fica aberta (apenas para uso local).
 */
export function apiKeyAuth(req: Request, _res: Response, next: NextFunction) {
  if (!env.API_KEY) return next();
  const provided = req.header('x-api-key') ?? (typeof req.query.api_key === 'string' ? req.query.api_key : '');
  if (!provided || !safeEqual(provided, env.API_KEY)) throw new UnauthorizedError();
  next();
}
