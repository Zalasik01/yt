import { writeFile } from 'node:fs/promises';
import { env } from '../../config/env.js';
import { fetchOrThrow } from '../../lib/http.js';
import { ProviderError } from '../../lib/errors.js';
import type { ImageProvider, ImageRequest } from './image.types.js';

export class OpenAiImageProvider implements ImageProvider {
  readonly name = 'openai';

  async generate({ prompt, out_path }: ImageRequest): Promise<void> {
    if (!env.OPENAI_API_KEY) throw new ProviderError('openai-image', 'OPENAI_API_KEY não configurada');
    const response = await fetchOrThrow('openai-image', 'https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1536x1024', quality: 'medium', n: 1 }),
    });
    const json = (await response.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new ProviderError('openai-image', 'Resposta sem imagem');
    await writeFile(out_path, Buffer.from(b64, 'base64'));
  }
}
