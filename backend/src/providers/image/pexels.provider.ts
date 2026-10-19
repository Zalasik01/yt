import { env } from '../../config/env.js';
import { downloadTo, fetchOrThrow } from '../../lib/http.js';
import { ProviderError } from '../../lib/errors.js';
import type { ImageProvider, ImageRequest } from './image.types.js';

interface PexelsSearch {
  photos: { src: { large2x: string; original: string } }[];
}

/** Banco de fotos gratuito. Usa a search_query curta gerada pelo agente de cenas. */
export class PexelsImageProvider implements ImageProvider {
  readonly name = 'pexels';

  async generate({ prompt, search_query, out_path, seed = 0, aspect = 'landscape' }: ImageRequest): Promise<void> {
    if (!env.PEXELS_API_KEY) throw new ProviderError('pexels', 'PEXELS_API_KEY não configurada');
    const query = search_query || prompt.split(/\s+/).slice(0, 5).join(' ');
    const url = new URL('https://api.pexels.com/v1/search');
    url.searchParams.set('query', query);
    url.searchParams.set('orientation', aspect);
    url.searchParams.set('per_page', '10');
    const response = await fetchOrThrow('pexels', url.toString(), { headers: { authorization: env.PEXELS_API_KEY } });
    const json = (await response.json()) as PexelsSearch;
    if (json.photos.length === 0) throw new ProviderError('pexels', `Nenhuma foto para "${query}"`);
    const photo = json.photos[seed % json.photos.length]!;
    await downloadTo('pexels', photo.src.large2x, out_path);
  }
}
