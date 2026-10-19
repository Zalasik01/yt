import { ValidationError } from '../../lib/errors.js';
import { EdgeTtsProvider } from './edge.provider.js';
import { ElevenLabsTtsProvider } from './elevenlabs.provider.js';
import { OpenAiTtsProvider } from './openai.provider.js';
import type { TtsProvider } from './tts.types.js';

const registry: Record<string, () => TtsProvider> = {
  edge: () => new EdgeTtsProvider(),
  elevenlabs: () => new ElevenLabsTtsProvider(),
  openai: () => new OpenAiTtsProvider(),
};

export const TTS_PROVIDERS = Object.keys(registry);

export function getTts(name: string): TtsProvider {
  const factory = registry[name];
  if (!factory) throw new ValidationError(`Provedor de voz desconhecido: ${name}`);
  return factory();
}

export type { TtsProvider };
