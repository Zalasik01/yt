import type { z } from 'zod';
import type { LlmProvider, StructuredRequest } from './llm.types.js';

/** Modo demonstração: devolve respostas de exemplo, sem chamar nenhuma API. */
export class DemoLlmProvider implements LlmProvider {
  readonly name = 'demo';

  async generateStructured<TSchema extends z.ZodType>(request: StructuredRequest<TSchema>): Promise<z.infer<TSchema>> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return request.schema.parse(request.demo()) as z.infer<TSchema>;
  }
}
