import { z } from 'zod';
import { getLlm } from '../providers/llm/index.js';
import { scene_model } from '../models/scene.model.js';
import { video_model } from '../models/video.model.js';
import type { VideoScript } from '../models/entities.js';
import { demo_roteiro } from './demo-data.js';
import type { Agent, AgentContext } from './agent.types.js';
import { channelBrief, FACTORY_SYSTEM } from './prompts.js';

const WORDS_PER_MINUTE = 150;

const RoteiroSchema = z.object({
  title: z.string().describe('Título final para o YouTube, até 70 caracteres, curiosidade sem clickbait mentiroso'),
  description: z.string().describe('Descrição do YouTube com 2-3 parágrafos e chamada para inscrição'),
  tags: z.array(z.string()).describe('10 a 15 tags'),
  hook: z.string().describe('Gancho dos primeiros 15 segundos — narração'),
  blocks: z
    .array(
      z.object({
        narration: z.string().describe('Trecho de narração (2 a 4 frases, 30 a 60 palavras)'),
        visual: z.string().describe('O que deve aparecer na tela durante este trecho'),
      }),
    )
    .describe('Corpo do roteiro em blocos curtos e sequenciais'),
  outro: z.string().describe('Fechamento com revelação/reflexão e CTA curto'),
});

/** 2 · Roteiro — escreve a narração completa, dividida em cenas. */
export class RoteiroAgent implements Agent {
  readonly stage = 'roteiro' as const;

  async run({ video, channel, say }: AgentContext) {
    const target_words = channel.target_duration_minutes * WORDS_PER_MINUTE;
    await say(`escrevendo ~${target_words} palavras...`);

    const roteiro = await getLlm().generateStructured({
      schema: RoteiroSchema,
      demo: demo_roteiro,
      max_tokens: 32000,
      system: `${FACTORY_SYSTEM}\n\nVocê é o agente de ROTEIRO. Escreve narrações que prendem do primeiro ao último segundo.\n\n${channelBrief(channel)}`,
      prompt: [
        `Tema: ${video.topic}`,
        video.angle ? `Ângulo e pontos-chave:\n${video.angle}` : null,
        video.title ? `Título provisório: ${video.title}` : null,
        `Tamanho total da narração (gancho + blocos + fechamento): cerca de ${target_words} palavras.`,
        'Regras: frases curtas e faladas; nada de marcações de cena, emojis ou instruções dentro da narração; números por extenso quando soar melhor falado; crie loops abertos para segurar a audiência.',
        video.revision_notes ? `IMPORTANTE — o dono do canal pediu estas correções:\n${video.revision_notes}` : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
    });

    const script: VideoScript = { hook: roteiro.hook, blocks: roteiro.blocks, outro: roteiro.outro };
    const scene_texts = [
      { narration: roteiro.hook, visual: roteiro.blocks[0]?.visual ?? video.topic ?? '' },
      ...roteiro.blocks,
      { narration: roteiro.outro, visual: roteiro.blocks.at(-1)?.visual ?? video.topic ?? '' },
    ];

    await video_model.update(video.id, {
      title: roteiro.title,
      description: roteiro.description,
      tags: roteiro.tags,
      script,
    });
    await scene_model.replaceForVideo(
      video.id,
      scene_texts.map((scene, position) => ({
        video_id: video.id,
        position,
        narration_text: scene.narration,
        image_prompt: scene.visual,
        search_query: null,
        audio_path: null,
        image_path: null,
        duration_seconds: null,
      })),
    );

    const words = scene_texts.reduce((sum, scene) => sum + scene.narration.split(/\s+/).length, 0);
    await say(`roteiro pronto: ${scene_texts.length} blocos, ${words} palavras`);
    return { title: roteiro.title, blocks: scene_texts.length, words };
  }
}
