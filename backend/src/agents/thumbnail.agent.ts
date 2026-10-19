import { z } from 'zod';
import { getLlm } from '../providers/llm/index.js';
import { getImageProvider } from '../providers/image/index.js';
import { video_model } from '../models/video.model.js';
import { renderThumbnail } from '../media/compose.js';
import { withRetry } from '../lib/concurrency.js';
import { demo_thumbnail } from './demo-data.js';
import type { Agent, AgentContext } from './agent.types.js';
import { channelBrief, FACTORY_SYSTEM } from './prompts.js';

const ThumbnailSchema = z.object({
  text: z.string().describe('Texto da thumbnail: 2 a 4 palavras de impacto, complementa o título sem repeti-lo'),
  image_prompt: z.string().describe('Prompt em inglês: composição simples, um elemento central forte, alto contraste'),
  search_query: z.string().describe('2 a 4 palavras em inglês para banco de imagens'),
});

/** 7 · Thumbnail — cria a capa do vídeo com texto de impacto. */
export class ThumbnailAgent implements Agent {
  readonly stage = 'thumbnail' as const;

  async run({ video, channel, workspace, say }: AgentContext) {
    await say('pensando numa capa que dá clique...');
    const plan = await getLlm().generateStructured({
      schema: ThumbnailSchema,
      demo: demo_thumbnail,
      system: `${FACTORY_SYSTEM}\n\nVocê é o agente de THUMBNAIL. Especialista em CTR.\n\n${channelBrief(channel)}`,
      prompt: `Título do vídeo: ${video.title}\nTema: ${video.topic}\nEstilo visual do canal: ${channel.image_style}\nO texto será sobreposto no canto inferior esquerdo: deixe esse espaço livre na composição.`,
    });

    const image = workspace.file('thumbnail_base.png');
    await withRetry(() =>
      getImageProvider(channel.image_provider).generate({
        prompt: `${plan.image_prompt}, ${channel.image_style}, youtube thumbnail, no text`,
        search_query: plan.search_query,
        out_path: image,
        seed: 999,
      }),
    );
    const out = workspace.file('thumbnail.jpg');
    await renderThumbnail({ image_path: image, text: plan.text, out_path: out });
    const thumbnail_path = await workspace.publish(out, 'image/jpeg');
    await video_model.update(video.id, { thumbnail_path, thumbnail_text: plan.text });
    await say(`capa pronta: "${plan.text}"`);
    return { text: plan.text, thumbnail_path };
  }
}
