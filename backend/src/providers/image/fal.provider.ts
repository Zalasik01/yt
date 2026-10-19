import { env } from '../../config/env.js';
import { downloadTo, fetchOrThrow } from '../../lib/http.js';
import { ProviderError } from '../../lib/errors.js';
import type { ImageProvider, ImageRequest } from './image.types.js';

/** FLUX schnell via fal.ai — barato e rápido para imagens de cena. */
export class FalImageProvider implements ImageProvider {
  readonly name = 'fal';

  async generate({ prompt, out_path, seed, aspect = 'landscape' }: ImageRequest): Promise<void> {
    if (!env.FAL_API_KEY) throw new ProviderError('fal', 'FAL_API_KEY não configurada');
    const response = await fetchOrThrow('fal', 'https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: { authorization: `Key ${env.FAL_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, image_size: aspect === 'square' ? 'square_hd' : 'landscape_16_9', num_images: 1, seed }),
    });
    const json = (await response.json()) as { images?: { url: string }[] };
    const url = json.images?.[0]?.url;
    if (!url) throw new ProviderError('fal', 'Resposta sem imagem');
    await downloadTo('fal', url, out_path);
  }
}
