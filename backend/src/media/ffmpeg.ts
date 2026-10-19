import { spawn } from 'node:child_process';
import { AppError } from '../lib/errors.js';

function run(binary: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      if (stderr.length > 20_000) stderr = stderr.slice(-10_000);
    });
    child.on('error', (error) => reject(new AppError(`${binary} não encontrado: ${error.message}`, 500, 'ffmpeg_error')));
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new AppError(`${binary} falhou (código ${code}): ${stderr.slice(-1500)}`, 500, 'ffmpeg_error'));
    });
  });
}

export function ffmpeg(args: string[]): Promise<string> {
  return run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
}

export async function probeDuration(file_path: string): Promise<number> {
  const output = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file_path,
  ]);
  const duration = Number.parseFloat(output.trim());
  if (!Number.isFinite(duration)) throw new AppError(`Duração inválida para ${file_path}`, 500, 'ffmpeg_error');
  return duration;
}
