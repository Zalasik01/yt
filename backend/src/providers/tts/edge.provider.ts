import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { ProviderError } from '../../lib/errors.js';
import type { TtsProvider } from './tts.types.js';

/** Vozes neurais da Microsoft Edge — gratuitas, ótimas para começar. */
export class EdgeTtsProvider implements TtsProvider {
  readonly name = 'edge';

  async synthesize(text: string, voice: string, out_path: string): Promise<void> {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text);
      await pipeline(audioStream, createWriteStream(out_path));
    } catch (error) {
      throw new ProviderError('edge-tts', (error as Error).message);
    } finally {
      tts.close();
    }
  }
}
