import type { z } from 'zod';

export interface StructuredRequest<TSchema extends z.ZodType> {
  system: string;
  prompt: string;
  schema: TSchema;
  max_tokens?: number;
  /** Resposta de exemplo usada no modo demonstração (LLM_PROVIDER=demo). */
  demo: () => z.infer<TSchema>;
}

export interface LlmProvider {
  readonly name: string;
  generateStructured<TSchema extends z.ZodType>(request: StructuredRequest<TSchema>): Promise<z.infer<TSchema>>;
}
