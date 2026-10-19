import { writeFile } from 'node:fs/promises';
import { ProviderError } from './errors.js';

export async function fetchOrThrow(provider: string, url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(180_000) });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new ProviderError(provider, `HTTP ${response.status}: ${body.slice(0, 500)}`);
  }
  return response;
}

export async function downloadTo(provider: string, url: string, out_path: string, init?: RequestInit): Promise<void> {
  const response = await fetchOrThrow(provider, url, init);
  await writeFile(out_path, Buffer.from(await response.arrayBuffer()));
}
