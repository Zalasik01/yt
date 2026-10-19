import { env } from '../../config/env.js';
import { AnthropicProvider } from './anthropic.provider.js';
import { DemoLlmProvider } from './demo.provider.js';
import type { LlmProvider } from './llm.types.js';

let instance: LlmProvider | null = null;

export function getLlm(): LlmProvider {
  instance ??= env.LLM_PROVIDER === 'demo' ? new DemoLlmProvider() : new AnthropicProvider();
  return instance;
}

export type { LlmProvider };
