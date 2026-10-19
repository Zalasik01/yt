import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { env } from '../../config/env.js';
import { ProviderError } from '../../lib/errors.js';
import type { LlmProvider, StructuredRequest } from './llm.types.js';

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) throw new ProviderError('anthropic', 'ANTHROPIC_API_KEY não configurada');
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  async generateStructured<TSchema extends z.ZodType>(request: StructuredRequest<TSchema>): Promise<z.infer<TSchema>> {
    try {
      const response = await this.client.beta.messages.parse({
        model: env.LLM_MODEL,
        max_tokens: request.max_tokens ?? 16000,
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
        output_config: {
          effort: env.LLM_EFFORT,
          format: betaZodOutputFormat(request.schema),
        },
        // Se o modelo recusar por política, a API tenta de novo no modelo
        // de fallback recomendado — sem custo de lógica extra aqui.
        ...(env.LLM_FALLBACKS
          ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
          : {}),
      });

      if (response.stop_reason === 'refusal') {
        throw new ProviderError('anthropic', `Pedido recusado (${response.stop_details?.category ?? 'sem categoria'})`);
      }
      if (response.stop_reason === 'max_tokens') {
        throw new ProviderError('anthropic', 'Resposta cortada por max_tokens');
      }
      if (response.parsed_output == null) {
        throw new ProviderError('anthropic', 'Resposta não pôde ser validada contra o schema');
      }
      return response.parsed_output as z.infer<TSchema>;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof Anthropic.RateLimitError) throw new ProviderError('anthropic', 'Rate limit — tente mais tarde');
      if (error instanceof Anthropic.AuthenticationError) throw new ProviderError('anthropic', 'API key inválida');
      if (error instanceof Anthropic.APIError) throw new ProviderError('anthropic', `${error.status}: ${error.message}`);
      throw error;
    }
  }
}
