export interface ImageRequest {
  prompt: string;
  search_query?: string | null;
  out_path: string;
  /** Semente para variar resultados determinísticos (ex.: índice da cena). */
  seed?: number;
}

export interface ImageProvider {
  readonly name: string;
  /** Gera (ou busca) uma imagem 16:9 e grava em out_path (PNG ou JPG). */
  generate(request: ImageRequest): Promise<void>;
}
