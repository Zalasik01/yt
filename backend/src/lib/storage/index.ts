import { env } from '../../config/env.js';
import { LocalStorageDriver } from './local.storage.js';
import { SupabaseStorageDriver } from './supabase.storage.js';
import type { StorageDriver } from './storage.types.js';

export const storage: StorageDriver =
  env.STORAGE_DRIVER === 'local' ? new LocalStorageDriver() : new SupabaseStorageDriver();

export type { StorageDriver };
