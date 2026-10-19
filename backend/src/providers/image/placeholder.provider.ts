import { ffmpeg } from '../../media/ffmpeg.js';
import type { ImageProvider, ImageRequest } from './image.types.js';

const PALETTES = [
  ['0x0b1020', '0x3a1c4a'],
  ['0x050505', '0x2b0f0f'],
  ['0x0a1a1a', '0x113344'],
  ['0x120a1f', '0x402060'],
  ['0x0d0d0d', '0x1f2b3a'],
];

/** Gera um fundo escuro com gradiente — permite testar o pipeline sem chave de imagem. */
export class PlaceholderImageProvider implements ImageProvider {
  readonly name = 'placeholder';

  async generate({ out_path, seed = 0, aspect = 'landscape' }: ImageRequest): Promise<void> {
    const [c0, c1] = PALETTES[seed % PALETTES.length]!;
    const [width, height] = aspect === 'square' ? [1080, 1080] : [1920, 1080];
    await ffmpeg([
      '-f', 'lavfi',
      '-i', `gradients=s=${width}x${height}:c0=${c0}:c1=${c1}:x0=0:y0=0:x1=${width}:y1=${height}:seed=${seed + 1}`,
      '-vf', 'noise=alls=8:allf=t,vignette=PI/4',
      '-frames:v', '1',
      out_path,
    ]);
  }
}
