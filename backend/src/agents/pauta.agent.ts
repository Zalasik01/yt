import { z } from 'zod';
import { getLlm } from '../providers/llm/index.js';
import { video_model } from '../models/video.model.js';
import { demo_pauta } from './demo-data.js';
import type { Agent, AgentContext } from './agent.types.js';
import { channelBrief, FACTORY_SYSTEM } from './prompts.js';

const PautaSchema = z.object({
  topic: z.string().describe('Tema do vídeo em uma frase'),
  angle: z.string().describe('Ângulo narrativo: o que torna este vídeo único e por que alguém clicaria'),
  working_title: z.string().describe('Título provisório, até 70 caracteres'),
  key_points: z.array(z.string()).describe('5 a 8 pontos que o roteiro deve cobrir'),
});

/** 1 · Pauta — escolhe (ou refina) o tema e o ângulo do vídeo. */
export class PautaAgent implements Agent {
  readonly stage = 'pauta' as const;

  async run({ video, channel, say }: AgentContext) {
    await say(video.topic ? 'refinando a pauta sugerida...' : 'caçando um tema que prende...');
    const previous = await video_model.listRecentTitles(channel.id, 60);

    const pauta = await getLlm().generateStructured({
      schema: PautaSchema,
      demo: () => demo_pauta(video.topic),
      system: `${FACTORY_SYSTEM}\n\nVocê é o agente de PAUTA.\n\n${channelBrief(channel)}`,
      prompt: [
        video.topic
          ? `O dono do canal sugeriu este tema: "${video.topic}". Refine-o num ângulo forte.`
          : 'Proponha UM tema novo com alto potencial de retenção e clique para este nicho.',
        previous.length
          ? `Evite repetir estes temas já produzidos:\n${previous.map((title) => `- ${title}`).join('\n')}`
          : null,
        'Priorize histórias com mistério, tensão e uma revelação no final.',
      ]
        .filter(Boolean)
        .join('\n\n'),
    });

    await video_model.update(video.id, {
      topic: pauta.topic,
      angle: `${pauta.angle}\n\nPontos-chave:\n${pauta.key_points.map((point) => `- ${point}`).join('\n')}`,
      title: pauta.working_title,
    });
    await say(`pauta fechada: ${pauta.working_title}`);
    return pauta;
  }
}
