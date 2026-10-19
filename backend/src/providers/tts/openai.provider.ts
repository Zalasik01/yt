import { env } from '../../config/env.js';
import { downloadTo } from '../../lib/http.js';
import { ProviderError } from '../../lib/errors.js';
import type { TtsProvider } from './tts.types.js';

export class OpenAiTtsProvider implements TtsProvider {
  readonly name = 'openai';

  async synthesize(text: string, voice: string, out_path: string): Promise<void> {
    if (!env.OPENAI_API_KEY) throw new ProviderError('openai-tts', 'OPENAI_API_KEY não configurada');
    await downloadTo('openai-tts', 'https://api.openai.com/v1/audio/speech', out_path, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: text, response_format: 'mp3' }),
    });
  }
}
