const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') + '/api/v1';
const API_KEY: string | undefined = import.meta.env.VITE_API_KEY;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(json?.error?.message ?? `Erro ${response.status}`, response.status, json?.error?.code);
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string) => request<void>('DELETE', path),
};

/** URL para <video>/<img>: passa pela API, que resolve o storage. */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  const params = new URLSearchParams({ path });
  if (API_KEY) params.set('api_key', API_KEY);
  return `${BASE_URL}/media?${params.toString()}`;
}
