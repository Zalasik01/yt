export interface StorageDriver {
  readonly name: string;
  upload(local_path: string, remote_path: string, content_type: string): Promise<string>;
  download(remote_path: string, local_path: string): Promise<void>;
  /** URL temporária para o navegador (driver supabase) ou caminho local (driver local). */
  resolve(remote_path: string): Promise<{ type: 'redirect'; url: string } | { type: 'file'; path: string }>;
  remove(remote_path: string): Promise<void>;
  removePrefix(prefix: string): Promise<void>;
}
