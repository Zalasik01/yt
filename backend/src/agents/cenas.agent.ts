import { mkdir } from 'node:fs/promises';
import { z } from 'zod';
import { getLlm } from '../providers/llm/index.js';
import { getImageProvider } from '../providers/image/index.js';
import { scene_model } from '../models/scene.model.js';
import { mapLimit, withRetry } from '../lib/concurrency.js';
import { demo_cenas } from './demo-data.js';
import type { Agent, AgentContext } from './agent.types.js';
import { channelBrief, FACTORY_SYSTEM } from './prompts.js';

const CenasSchema = z.object({
  scenes: z.array(
    z.object({
      position: z.number().int(),
      image_prompt: z.string().describe('Prompt em inglês para gerador de imagem, detalhado e cinematográfico'),
      search_query: z.string().describe('2 a 4 palavras em inglês para busca em banco de imagens'),
    }),
  ),
});

/** 4 · Cenas — cria o prompt visual de cada bloco e gera as imagens. */
export class CenasAgent implements Agent {
  readonly stage = 'cenas' as const;

  async run({ video, channel, workspace, say }: AgentContext) {
    const scenes = await scene_model.listByVideo(video.id);
    await say(`dirigindo ${scenes.length} cenas...`);

    const plan = await getLlm().generateStructured({
      schema: CenasSchema,
      demo: () => demo_cenas(scenes.map((scene) => scene.position)),
      max_tokens: 32000,
      system: `${FACTORY_SYSTEM}\n\nVocê é o agente de CENAS (diretor de arte).\n\n${channelBrief(channel)}`,
      prompt: [
        `Vídeo: ${video.title}`,
        `Estilo visual obrigatório: ${channel.image_style}`,
        'Para cada bloco abaixo, escreva um prompt de imagem que ilustre a narração. Mantenha consistência visual entre as cenas (mesma paleta, época e personagens). Nada de texto escrito na imagem, nada de violência gráfica, nada de pessoas reais identificáveis.',
        scenes
          .map((scene) => `[${scene.position}] narração: ${scene.narration_text}\n     sugestão visual: ${scene.image_prompt ?? '-'}`)
          .join('\n'),
      ].join('\n\n'),
    });

    const by_position = new Map(plan.scenes.map((item) => [item.position, item]));
    const provider = getImageProvider(channel.image_provider);
    await mkdir(workspace.file('images'), { recursive: true });

    let done = 0;
    await mapLimit(scenes, 3, async (scene) => {
      const planned = by_position.get(scene.position);
      const image_prompt = `${planned?.image_prompt ?? scene.image_prompt ?? video.topic}, ${channel.image_style}`;
      const local = workspace.file('images', `scene_${String(scene.position).padStart(3, '0')}.png`);
      await withRetry(() =>
        provider.generate({ prompt: image_prompt, search_query: planned?.search_query, out_path: local, seed: scene.position }),
      );
      const image_path = await workspace.publish(local, 'image/png');
      await scene_model.update(scene.id, { image_prompt, search_query: planned?.search_query ?? null, image_path });
      done++;
      if (done % 5 === 0 || done === scenes.length) await say(`cenas geradas: ${done}/${scenes.length}`);
    });

    return { scenes: scenes.length, provider: provider.name };
  }
}
