import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../lib/errors.js';

interface Schemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

export interface Validated<TBody = unknown, TQuery = unknown, TParams = unknown> {
  body: TBody;
  query: TQuery;
  params: TParams;
}

declare module 'express-serve-static-core' {
  interface Request {
    validated: Validated<any, any, any>;
  }
}

/** Valida body/query/params com zod e expõe o resultado tipado em req.validated. */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const validated: Validated = { body: req.body, query: req.query, params: req.params };
    for (const key of ['body', 'query', 'params'] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key] ?? {});
      if (!result.success) {
        throw new ValidationError(`Parâmetros inválidos em ${key}`, z.flattenError(result.error));
      }
      validated[key] = result.data;
    }
    req.validated = validated;
    next();
  };
}
