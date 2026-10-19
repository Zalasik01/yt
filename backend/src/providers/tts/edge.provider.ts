import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { ProviderError } from '../../lib/errors.js';
import type { TtsProvider } from './tts.types.js';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Vozes neurais da Microsoft Edge — gratuitas, ótimas para começar. */
export class EdgeTtsProvider implements TtsProvider {
  readonly name = 'edge';

  // O serviço devolve 429 quando abrimos várias conexões ao mesmo tempo:
  // serializa as chamadas e espaça um pouco.
  private queue: Promise<unknown> = Promise.resolve();

  synthesize(text: string, voice: string, out_path: string): Promise<void> {
    const run = this.queue.then(() => this.synthesizeWithBackoff(text, voice, out_path));
    this.queue = run.catch(() => undefined).then(() => sleep(600));
    return run;
  }

  private async synthesizeWithBackoff(text: string, voice: string, out_path: string): Promise<void> {
    const waits = [5_000, 15_000, 30_000];
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.synthesizeOnce(text, voice, out_path);
      } catch (error) {
        const is_rate_limit = /429/.test((error as Error).message);
        if (!is_rate_limit || attempt >= waits.length) throw error;
        await sleep(waits[attempt]!);
      }
    }
  }

  private async synthesizeOnce(text: string, voice: string, out_path: string): Promise<void> {
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
