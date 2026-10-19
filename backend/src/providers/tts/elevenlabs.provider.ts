import { env } from '../../config/env.js';
import { downloadTo } from '../../lib/http.js';
import { ProviderError } from '../../lib/errors.js';
import type { TtsProvider } from './tts.types.js';

export class ElevenLabsTtsProvider implements TtsProvider {
  readonly name = 'elevenlabs';

  async synthesize(text: string, voice: string, out_path: string): Promise<void> {
    if (!env.ELEVENLABS_API_KEY) throw new ProviderError('elevenlabs', 'ELEVENLABS_API_KEY não configurada');
    await downloadTo(
      'elevenlabs',
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`,
      out_path,
      {
        method: 'POST',
        headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
      },
    );
  }
}
