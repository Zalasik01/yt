import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { ffmpeg } from './ffmpeg.js';
import { buildAss, chunkNarration, type AssStyle } from './subtitles.js';

export const SCENE_GAP_SECONDS = 0.35;

export interface Frame {
  width: number;
  height: number;
  fps: number;
}

export const LANDSCAPE: Frame = { width: env.VIDEO_WIDTH, height: env.VIDEO_HEIGHT, fps: env.VIDEO_FPS };
export const PORTRAIT: Frame = { width: 1080, height: 1920, fps: env.VIDEO_FPS };

/** Escapa um caminho para uso dentro de um filtro do ffmpeg (ass=...). */
function filterPath(file_path: string): string {
  return file_path.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

/** Movimento de câmera alternado por cena: zoom in, zoom out, pan. */
function kenBurns(index: number, frames: number, frame: Frame): string {
  const size = `s=${frame.width}x${frame.height}`;
  const center = "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'";
  const step = (0.18 / frames).toFixed(6);
  switch (index % 4) {
    case 0:
      return `zoompan=z='min(1+${step}*on,1.18)':${center}:d=${frames}:${size}:fps=${frame.fps}`;
    case 1:
      return `zoompan=z='max(1.18-${step}*on,1)':${center}:d=${frames}:${size}:fps=${frame.fps}`;
    case 2:
      return `zoompan=z=1.15:x='(iw-iw/zoom)*on/${frames}':y='ih/2-(ih/zoom/2)':d=${frames}:${size}:fps=${frame.fps}`;
    default:
      return `zoompan=z=1.15:x='(iw-iw/zoom)*(1-on/${frames})':y='ih/2-(ih/zoom/2)':d=${frames}:${size}:fps=${frame.fps}`;
  }
}

export function captionStyle(frame: Frame): AssStyle {
  const portrait = frame.height > frame.width;
  return {
    width: frame.width,
    height: frame.height,
    font: env.SUBTITLE_FONT,
    font_size: portrait ? 78 : 58,
    outline: portrait ? 6 : 4,
    alignment: portrait ? 5 : 2,
    margin_v: portrait ? 0 : 70,
    margin_h: portrait ? 70 : 120,
  };
}

export interface SceneClipInput {
  index: number;
  image_path: string;
  narration: string;
  duration: number;
  out_path: string;
  frame: Frame;
  /** Texto de gancho exibido no topo nos primeiros segundos (shorts). */
  headline?: string;
}

/** Renderiza uma cena: imagem com Ken Burns + legendas queimadas. */
export async function renderSceneClip(input: SceneClipInput): Promise<void> {
  const { frame } = input;
  const frames = Math.max(1, Math.round(input.duration * frame.fps));
  const styles: Record<string, AssStyle> = { caption: captionStyle(frame) };
  const events = chunkNarration(input.narration, input.duration - SCENE_GAP_SECONDS).map((event) => ({
    ...event,
    style: 'caption',
  }));

  if (input.headline) {
    styles.headline = {
      ...captionStyle(frame),
      font_size: 84,
      alignment: 8,
      margin_v: 220,
      primary_color: '&H0000E5FF', // amarelo
    };
    events.push({ start: 0, end: Math.min(4, input.duration), text: input.headline.toUpperCase(), style: 'headline' });
  }

  const ass_path = input.out_path.replace(/\.mp4$/, '.ass');
  await writeFile(ass_path, buildAss(styles, events));

  // Sobredimensiona a imagem (2x) para o zoompan não tremer.
  const cover = `scale=${frame.width * 2}:${frame.height * 2}:force_original_aspect_ratio=increase,crop=${frame.width * 2}:${frame.height * 2}`;
  await ffmpeg([
    '-i', input.image_path,
    '-vf', `${cover},${kenBurns(input.index, frames, frame)},ass='${filterPath(ass_path)}',format=yuv420p`,
    '-frames:v', String(frames),
    '-r', String(frame.fps),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '21',
    '-an',
    input.out_path,
  ]);
}

/** Normaliza o áudio da cena e acrescenta a pausa entre cenas. */
export async function prepareSceneAudio(mp3_path: string, out_wav: string): Promise<void> {
  await ffmpeg([
    '-i', mp3_path,
    '-af', `apad=pad_dur=${SCENE_GAP_SECONDS}`,
    '-ar', '44100',
    '-ac', '2',
    out_wav,
  ]);
}

async function writeConcatList(files: string[], list_path: string): Promise<void> {
  const body = files.map((file) => `file '${path.resolve(file).replace(/'/g, "'\\''")}'`).join('\n');
  await writeFile(list_path, body);
}

async function pickBackgroundMusic(): Promise<string | null> {
  if (!env.BACKGROUND_MUSIC_DIR) return null;
  const files = await readdir(env.BACKGROUND_MUSIC_DIR).catch(() => [] as string[]);
  const tracks = files.filter((file) => /\.(mp3|wav|m4a|ogg)$/i.test(file));
  if (tracks.length === 0) return null;
  return path.join(env.BACKGROUND_MUSIC_DIR, tracks[Math.floor(Math.random() * tracks.length)]!);
}

export interface AssembleInput {
  clip_paths: string[];
  audio_paths: string[]; // wav já com pausa
  work_dir: string;
  out_path: string;
}

/** Junta clipes + narração (+ trilha de fundo opcional) no vídeo final. */
export async function assembleVideo({ clip_paths, audio_paths, work_dir, out_path }: AssembleInput): Promise<void> {
  const clips_list = path.join(work_dir, 'clips.txt');
  const audio_list = path.join(work_dir, 'audio.txt');
  const narration = path.join(work_dir, 'narration.wav');
  await writeConcatList(clip_paths, clips_list);
  await writeConcatList(audio_paths, audio_list);
  await ffmpeg(['-f', 'concat', '-safe', '0', '-i', audio_list, '-c', 'copy', narration]);

  const music = await pickBackgroundMusic();
  const args = ['-f', 'concat', '-safe', '0', '-i', clips_list, '-i', narration];
  if (music) {
    args.push(
      '-stream_loop', '-1', '-i', music,
      '-filter_complex',
      `[2:a]volume=${env.BACKGROUND_MUSIC_VOLUME}[bg];[1:a][bg]amix=inputs=2:duration=first:normalize=0[a]`,
      '-map', '0:v', '-map', '[a]',
    );
  } else {
    args.push('-map', '0:v', '-map', '1:a');
  }
  args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out_path);
  await ffmpeg(args);
}

export interface ThumbnailInput {
  image_path: string;
  text: string;
  out_path: string;
}

export async function renderThumbnail({ image_path, text, out_path }: ThumbnailInput): Promise<void> {
  const ass_path = out_path.replace(/\.\w+$/, '.ass');
  const style: AssStyle = {
    width: 1280,
    height: 720,
    font: env.SUBTITLE_FONT,
    font_size: 112,
    outline: 9,
    alignment: 1,
    margin_h: 60,
    margin_v: 60,
    primary_color: '&H0000E5FF',
  };
  await writeFile(ass_path, buildAss({ thumb: style }, [{ start: 0, end: 10, text: text.toUpperCase() }]));
  await ffmpeg([
    '-i', image_path,
    '-vf', `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,eq=contrast=1.15:saturation=1.3,vignette=PI/5,ass='${filterPath(ass_path)}'`,
    '-frames:v', '1',
    '-q:v', '2',
    out_path,
  ]);
}
