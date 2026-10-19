export interface TtsProvider {
  readonly name: string;
  /** Gera um MP3 em out_path com o texto narrado. */
  synthesize(text: string, voice: string, out_path: string): Promise<void>;
}
