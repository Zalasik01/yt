import { mkdir } from 'node:fs/promises';
import { z } from 'zod';
import { getLlm } from '../providers/llm/index.js';
import { scene_model } from '../models/scene.model.js';
import { short_model } from '../models/short.model.js';
import { assembleVideo, PORTRAIT, prepareSceneAudio, renderSceneClip, SCENE_GAP_SECONDS } from '../media/compose.js';
import type { Scene } from '../models/entities.js';
import { demo_shorts } from './demo-data.js';
import type { Agent, AgentContext } from './agent.types.js';
import { channelBrief, FACTORY_SYSTEM } from './prompts.js';

const MAX_SHORT_SECONDS = 58;

const ShortsSchema = z.object({
  shorts: z.array(
    z.object({
      start_position: z.number().int().describe('Primeira cena do corte'),
      end_position: z.number().int().describe('Última cena do corte (inclusive)'),
      title: z.string().describe('Título do short, até 60 caracteres, com #shorts no final'),
      hook: z.string().describe('Texto curtíssimo (até 6 palavras) exibido no topo nos primeiros segundos'),
      description: z.string().describe('Descrição curta convidando para o vídeo completo'),
    }),
  ),
});

/** 6 · Shorts — escolhe os melhores trechos e gera cortes verticais 9:16. */
export class ShortsAgent implements Agent {
  readonly stage = 'shorts' as const;

  async run({ video, channel, workspace, say }: AgentContext) {
    if (channel.shorts_per_video === 0) {
      await say('canal sem shorts configurados — pulando');
      return { shorts: 0 };
    }
    const scenes = await scene_model.listByVideo(video.id);
    await say(`garimpando ${channel.shorts_per_video} cortes virais...`);

    const plan = await getLlm().generateStructured({
      schema: ShortsSchema,
      demo: () => demo_shorts(scenes.map((scene) => scene.position), channel.shorts_per_video),
      system: `${FACTORY_SYSTEM}\n\nVocê é o agente de SHORTS. Encontra trechos que funcionam sozinhos e prendem em 1 segundo.\n\n${channelBrief(channel)}`,
      prompt: [
        `Vídeo: ${video.title}`,
        `Escolha ${channel.shorts_per_video} trechos de cenas CONSECUTIVAS, cada um com no máximo ${MAX_SHORT_SECONDS} segundos somados e no mínimo 15 segundos. Os trechos não devem se sobrepor.`,
        scenes.map((scene) => `[${scene.position}] (${scene.duration_seconds?.toFixed(1)}s) ${scene.narration_text}`).join('\n'),
      ].join('\n\n'),
    });

    const selections = plan.shorts
      .map((item) => this.fitSelection(scenes, item.start_position, item.end_position))
      .map((range, index) => ({ ...plan.shorts[index]!, range }))
      .filter((item) => item.range.length > 0)
      .slice(0, channel.shorts_per_video);

    const offsets = this.sceneOffsets(scenes);
    await short_model.replaceForVideo(
      video.id,
      selections.map((item, position) => ({
        video_id: video.id,
        position,
        title: item.title,
        hook: item.hook,
        description: item.description,
        start_seconds: offsets.get(item.range[0]!.position)!,
        end_seconds:
          offsets.get(item.range.at(-1)!.position)! + (item.range.at(-1)!.duration_seconds ?? 0) + SCENE_GAP_SECONDS,
        status: 'pending',
        video_path: null,
        scheduled_at: null,
        youtube_video_id: null,
      })),
    );
    const shorts = await short_model.listByVideo(video.id);

    for (const [index, short] of shorts.entries()) {
      await say(`cortando short ${index + 1}/${shorts.length}: ${short.title}`);
      const dir = workspace.file('shorts', String(short.position));
      await mkdir(dir, { recursive: true });
      const clip_paths: string[] = [];
      const audio_paths: string[] = [];

      for (const [i, scene] of selections[index]!.range.entries()) {
        const audio = await workspace.fetch(scene.audio_path!);
        const image = await workspace.fetch(scene.image_path!);
        const wav = `${dir}/scene_${i}.wav`;
        const clip = `${dir}/scene_${i}.mp4`;
        await prepareSceneAudio(audio, wav);
        await renderSceneClip({
          index: scene.position,
          image_path: image,
          narration: scene.narration_text,
          duration: (scene.duration_seconds ?? 0) + SCENE_GAP_SECONDS,
          out_path: clip,
          frame: PORTRAIT,
          headline: i === 0 ? (short.hook ?? undefined) : undefined,
        });
        clip_paths.push(clip);
        audio_paths.push(wav);
      }

      const out = workspace.file('shorts', `short_${short.position}.mp4`);
      await assembleVideo({ clip_paths, audio_paths, work_dir: dir, out_path: out });
      const video_path = await workspace.publish(out, 'video/mp4');
      await short_model.update(short.id, { video_path, status: 'rendered' });
    }

    await say(`${shorts.length} shorts prontos`);
    return { shorts: shorts.length };
  }

  /** Garante cenas válidas, consecutivas e dentro do limite de duração. */
  private fitSelection(scenes: Scene[], start: number, end: number): Scene[] {
    const range = scenes.filter((scene) => scene.position >= Math.min(start, end) && scene.position <= Math.max(start, end));
    const fitted: Scene[] = [];
    let total = 0;
    for (const scene of range) {
      const duration = (scene.duration_seconds ?? 0) + SCENE_GAP_SECONDS;
      if (total + duration > MAX_SHORT_SECONDS && fitted.length > 0) break;
      fitted.push(scene);
      total += duration;
    }
    return total <= MAX_SHORT_SECONDS + 1 ? fitted : [];
  }

  private sceneOffsets(scenes: Scene[]): Map<number, number> {
    const offsets = new Map<number, number>();
    let cursor = 0;
    for (const scene of scenes) {
      offsets.set(scene.position, cursor);
      cursor += (scene.duration_seconds ?? 0) + SCENE_GAP_SECONDS;
    }
    return offsets;
  }
}
