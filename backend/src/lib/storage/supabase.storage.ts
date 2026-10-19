import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import { supabase } from '../supabase.js';
import { AppError } from '../errors.js';
import type { StorageDriver } from './storage.types.js';

export class SupabaseStorageDriver implements StorageDriver {
  readonly name = 'supabase';

  private get bucket() {
    return supabase.storage.from(env.SUPABASE_STORAGE_BUCKET);
  }

  async upload(local_path: string, remote_path: string, content_type: string): Promise<string> {
    const body = await readFile(local_path);
    const { error } = await this.bucket.upload(remote_path, body, { contentType: content_type, upsert: true });
    if (error) throw new AppError(`Falha no upload de ${remote_path}: ${error.message}`, 500, 'storage_error');
    return remote_path;
  }

  async download(remote_path: string, local_path: string): Promise<void> {
    const { data, error } = await this.bucket.download(remote_path);
    if (error || !data) {
      throw new AppError(`Falha no download de ${remote_path}: ${error?.message}`, 500, 'storage_error');
    }
    await mkdir(path.dirname(local_path), { recursive: true });
    await writeFile(local_path, Buffer.from(await data.arrayBuffer()));
  }

  async resolve(remote_path: string) {
    const { data, error } = await this.bucket.createSignedUrl(remote_path, 60 * 60);
    if (error || !data) throw new AppError(`Arquivo indisponível: ${remote_path}`, 404, 'not_found');
    return { type: 'redirect' as const, url: data.signedUrl };
  }

  async remove(remote_path: string): Promise<void> {
    await this.bucket.remove([remote_path]);
  }

  async removePrefix(prefix: string): Promise<void> {
    const { data } = await this.bucket.list(prefix, { limit: 1000 });
    if (!data?.length) return;
    await this.bucket.remove(data.map((file) => `${prefix}/${file.name}`));
  }
}
