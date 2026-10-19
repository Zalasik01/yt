export class AppError extends Error {
  constructor(
    message: string,
    public readonly status_code = 500,
    public readonly code = 'internal_error',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} ${id} não encontrado` : `${resource} não encontrado`, 404, 'not_found');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, 'validation_error', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'conflict');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401, 'unauthorized');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 500, 'database_error', details);
  }
}

export class ProviderError extends AppError {
  constructor(provider: string, message: string) {
    super(`[${provider}] ${message}`, 502, 'provider_error');
  }
}
