import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import { NotFoundError, ValidationError } from '../errors.js';
import type { StorageDriver } from './storage.types.js';

/** Driver para desenvolvimento/uma máquina só: guarda tudo em WORK_DIR/storage. */
export class LocalStorageDriver implements StorageDriver {
  readonly name = 'local';
  private readonly root = path.resolve(env.WORK_DIR, 'storage');

  private toAbsolute(remote_path: string): string {
    const absolute = path.resolve(this.root, remote_path);
    if (!absolute.startsWith(this.root + path.sep)) throw new ValidationError('Caminho inválido');
    return absolute;
  }

  async upload(local_path: string, remote_path: string): Promise<string> {
    const target = this.toAbsolute(remote_path);
    if (path.resolve(local_path) !== target) {
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(local_path, target);
    }
    return remote_path;
  }

  async download(remote_path: string, local_path: string): Promise<void> {
    const source = this.toAbsolute(remote_path);
    if (path.resolve(local_path) === source) return;
    await mkdir(path.dirname(local_path), { recursive: true });
    await copyFile(source, local_path);
  }

  async resolve(remote_path: string) {
    const absolute = this.toAbsolute(remote_path);
    const exists = await stat(absolute).catch(() => null);
    if (!exists) throw new NotFoundError('Arquivo', remote_path);
    return { type: 'file' as const, path: absolute };
  }

  async remove(remote_path: string): Promise<void> {
    await rm(this.toAbsolute(remote_path), { force: true });
  }

  async removePrefix(prefix: string): Promise<void> {
    await rm(this.toAbsolute(prefix), { recursive: true, force: true });
  }
}
