import { mkdir } from 'node:fs/promises';
import { scene_model } from '../models/scene.model.js';
import { video_model } from '../models/video.model.js';
import { probeDuration } from '../media/ffmpeg.js';
import { assembleVideo, LANDSCAPE, prepareSceneAudio, renderSceneClip, SCENE_GAP_SECONDS } from '../media/compose.js';
import { AppError } from '../lib/errors.js';
import type { Agent, AgentContext } from './agent.types.js';

/** 5 · Montagem — junta imagem, movimento, legenda e narração no vídeo final. */
export class MontagemAgent implements Agent {
  readonly stage = 'montagem' as const;

  async run({ video, workspace, say }: AgentContext) {
    const scenes = await scene_model.listByVideo(video.id);
    const missing = scenes.filter((scene) => !scene.audio_path || !scene.image_path);
    if (missing.length) throw new AppError(`${missing.length} cenas sem áudio ou imagem`, 422, 'incomplete_scenes');

    await mkdir(workspace.file('clips'), { recursive: true });
    await say(`editando ${scenes.length} cenas...`);

    const clip_paths: string[] = [];
    const audio_paths: string[] = [];
    for (const scene of scenes) {
      const name = `scene_${String(scene.position).padStart(3, '0')}`;
      const audio = await workspace.fetch(scene.audio_path!);
      const image = await workspace.fetch(scene.image_path!);
      const wav = workspace.file('clips', `${name}.wav`);
      const clip = workspace.file('clips', `${name}.mp4`);

      await prepareSceneAudio(audio, wav);
      const duration = (scene.duration_seconds ?? (await probeDuration(audio))) + SCENE_GAP_SECONDS;
      await renderSceneClip({
        index: scene.position,
        image_path: image,
        narration: scene.narration_text,
        duration,
        out_path: clip,
        frame: LANDSCAPE,
      });
      clip_paths.push(clip);
      audio_paths.push(wav);
      if ((scene.position + 1) % 5 === 0) await say(`renderizando... ${scene.position + 1}/${scenes.length}`);
    }

    await say('juntando tudo e mixando o áudio...');
    const final_path = workspace.file('final.mp4');
    await assembleVideo({ clip_paths, audio_paths, work_dir: workspace.file('clips'), out_path: final_path });

    const duration_seconds = await probeDuration(final_path);
    const video_path = await workspace.publish(final_path, 'video/mp4');
    await video_model.update(video.id, { video_path, duration_seconds });
    await say(`vídeo montado: ${Math.floor(duration_seconds / 60)}:${String(Math.round(duration_seconds % 60)).padStart(2, '0')}`);
    return { duration_seconds, video_path };
  }
}
