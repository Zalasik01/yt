import { ValidationError } from '../../lib/errors.js';
import { FalImageProvider } from './fal.provider.js';
import type { ImageProvider } from './image.types.js';
import { OpenAiImageProvider } from './openai.provider.js';
import { PexelsImageProvider } from './pexels.provider.js';
import { PlaceholderImageProvider } from './placeholder.provider.js';

const registry: Record<string, () => ImageProvider> = {
  placeholder: () => new PlaceholderImageProvider(),
  openai: () => new OpenAiImageProvider(),
  fal: () => new FalImageProvider(),
  pexels: () => new PexelsImageProvider(),
};

export const IMAGE_PROVIDERS = Object.keys(registry);

export function getImageProvider(name: string): ImageProvider {
  const factory = registry[name];
  if (!factory) throw new ValidationError(`Provedor de imagem desconhecido: ${name}`);
  return factory();
}

export type { ImageProvider };
