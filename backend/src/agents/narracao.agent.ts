import { mkdir } from 'node:fs/promises';
import { getTts } from '../providers/tts/index.js';
import { scene_model } from '../models/scene.model.js';
import { probeDuration } from '../media/ffmpeg.js';
import { mapLimit, withRetry } from '../lib/concurrency.js';
import type { Agent, AgentContext } from './agent.types.js';

/** 3 · Narração — transforma cada bloco do roteiro em áudio. */
export class NarracaoAgent implements Agent {
  readonly stage = 'narracao' as const;

  async run({ video, channel, workspace, say }: AgentContext) {
    const scenes = await scene_model.listByVideo(video.id);
    const tts = getTts(channel.tts_provider);
    await say(`checando a pronúncia... (${scenes.length} blocos, voz ${channel.tts_voice})`);

    await mkdir(workspace.file('audio'), { recursive: true });
    let done = 0;
    const durations = await mapLimit(scenes, 3, async (scene) => {
      const local = workspace.file('audio', `scene_${String(scene.position).padStart(3, '0')}.mp3`);
      await withRetry(() => tts.synthesize(scene.narration_text, channel.tts_voice, local));
      const duration_seconds = await probeDuration(local);
      const audio_path = await workspace.publish(local, 'audio/mpeg');
      await scene_model.update(scene.id, { audio_path, duration_seconds });
      done++;
      if (done % 5 === 0 || done === scenes.length) await say(`narrando... ${done}/${scenes.length}`);
      return duration_seconds;
    });

    const total = durations.reduce((sum, value) => sum + value, 0);
    await say(`narração pronta: ${Math.round(total / 60)} min de áudio`);
    return { scenes: scenes.length, narration_seconds: Math.round(total) };
  }
}
