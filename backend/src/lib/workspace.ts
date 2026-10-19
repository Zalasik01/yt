import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { storage } from './storage/index.js';

/**
 * Diretório de trabalho local de um vídeo. Os workers são stateless: qualquer
 * arquivo que não estiver no disco é baixado do storage sob demanda, então
 * etapas diferentes podem rodar em máquinas diferentes.
 */
export class VideoWorkspace {
  readonly dir: string;

  constructor(readonly video_id: string) {
    this.dir = path.resolve(env.WORK_DIR, 'videos', video_id);
  }

  async ensure(): Promise<this> {
    await mkdir(this.dir, { recursive: true });
    return this;
  }

  file(...parts: string[]): string {
    return path.join(this.dir, ...parts);
  }

  /** Caminho remoto padronizado: videos/{video_id}/{nome}. */
  remote(...parts: string[]): string {
    return ['videos', this.video_id, ...parts].join('/');
  }

  async fetch(remote_path: string): Promise<string> {
    const local = this.file(...remote_path.split('/').slice(2));
    const exists = await stat(local).catch(() => null);
    if (!exists) await storage.download(remote_path, local);
    return local;
  }

  async publish(local_path: string, content_type: string): Promise<string> {
    const relative = path.relative(this.dir, local_path).split(path.sep);
    return storage.upload(local_path, this.remote(...relative), content_type);
  }

  async clean(): Promise<void> {
    await rm(this.dir, { recursive: true, force: true });
  }
}
