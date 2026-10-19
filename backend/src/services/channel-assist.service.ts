import { z } from 'zod';
import { FACTORY_SYSTEM } from '../agents/prompts.js';
import { getLlm } from '../providers/llm/index.js';

export type AssistField = 'name' | 'niche' | 'description';

export interface AssistContext {
  name?: string;
  niche?: string;
  description?: string;
  language?: string;
  tone?: string;
}

const SuggestionsSchema = z.object({
  suggestions: z.array(z.string()).describe('Sugestões prontas para uso, sem numeração nem aspas'),
});

const DEMO: Record<AssistField, string[]> = {
  name: ['Arquivo Sombrio', 'Véu Negro', 'Lado Oculto', 'Dossiê Noturno', 'Cripta 13', 'Eco do Passado'],
  niche: [
    'mistérios históricos não resolvidos',
    'casos criminais reais famosos',
    'lendas urbanas e folclore sombrio',
    'desastres e tragédias que mudaram o mundo',
    'curiosidades perturbadoras da ciência',
    'civilizações perdidas e enigmas arqueológicos',
  ],
  description: [
    'Canal de narrativas sombrias e investigativas sobre mistérios reais. Para quem gosta de histórias envolventes, bem pesquisadas e contadas sem pressa. Novos vídeos toda semana.',
  ],
};

function buildPrompt(field: AssistField, ctx: AssistContext): string {
  const known = [
    ctx.name && `Nome do canal: ${ctx.name}`,
    ctx.niche && `Nicho: ${ctx.niche}`,
    ctx.description && `Descrição atual: ${ctx.description}`,
    ctx.tone && `Tom de voz: ${ctx.tone}`,
    `Idioma: ${ctx.language ?? 'pt-BR'}`,
  ]
    .filter(Boolean)
    .join('\n');

  switch (field) {
    case 'name':
      return `${known}\n\nSugira 6 nomes criativos, curtos (1 a 3 palavras), fáceis de lembrar e de falar, bons para canal dark do YouTube. Evite nomes genéricos e de marcas existentes.`;
    case 'niche':
      return `${known}\n\nSugira 6 nichos específicos e viáveis para um canal dark (sem rosto), com público e conteúdo recorrente. Cada nicho em uma frase curta, minúscula, sem ponto final.`;
    case 'description':
      return ctx.description
        ? `${known}\n\nMelhore a descrição do canal e do público-alvo: mais clara, específica e atraente, sem exageros nem promessas falsas. Mantenha as informações do original. Até 600 caracteres. Devolva apenas 1 sugestão.`
        : `${known}\n\nEscreva a descrição do canal e do público-alvo: o que o canal entrega, para quem e com que frequência. Até 600 caracteres. Devolva apenas 1 sugestão.`;
  }
}

export class ChannelAssistService {
  async suggest(field: AssistField, ctx: AssistContext): Promise<string[]> {
    const result = await getLlm().generateStructured({
      schema: SuggestionsSchema,
      demo: () => ({ suggestions: DEMO[field] }),
      system: `${FACTORY_SYSTEM}\n\nVocê é consultor de estratégia de canais dark do YouTube. Responda no idioma do canal.`,
      prompt: buildPrompt(field, ctx),
      max_tokens: 2000,
    });
    return result.suggestions.map((item) => item.trim()).filter(Boolean);
  }
}

export const channel_assist_service = new ChannelAssistService();
