import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { env } from '../config/env.js';
import { withRetry } from '../lib/concurrency.js';
import { storage } from '../lib/storage/index.js';
import { renderBranding } from '../media/compose.js';
import type { Channel } from '../models/entities.js';
import { channel_model } from '../models/channel.model.js';
import { channelBrief, FACTORY_SYSTEM } from '../agents/prompts.js';
import { getImageProvider } from '../providers/image/index.js';
import { getLlm } from '../providers/llm/index.js';

export type BrandingKind = 'avatar' | 'banner';

const BrandingPlanSchema = z.object({
  image_prompt: z.string().describe('Prompt em inglês para o gerador de imagens, sem pedir texto na imagem'),
  search_query: z.string().describe('2 a 4 palavras em inglês para banco de fotos'),
});

/** Provedores que desenham a arte sozinhos; nos demais, sobrepomos o nome do canal. */
const AI_PROVIDERS = new Set(['openai', 'fal']);

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');

const BRIEFS: Record<BrandingKind, string> = {
  avatar:
    'FOTO DE PERFIL do canal: um único símbolo forte e centralizado (ícone/emblema/silhueta), alto contraste, legível em 98x98 px, composição quadrada.',
  banner:
    'BANNER do canal (2560x1440): cenário amplo e atmosférico; o assunto principal deve ficar no centro (área segura), bordas com respiro.',
};

export class BrandingService {
  async generate(channel_id: string, kind: BrandingKind): Promise<Channel> {
    const channel = await channel_model.getById(channel_id);

    const plan = await getLlm().generateStructured({
      schema: BrandingPlanSchema,
      demo: () => ({ image_prompt: `${channel.niche}, symbolic emblem, dark mood`, search_query: 'dark mystery' }),
      system: `${FACTORY_SYSTEM}\n\nVocê é o diretor de arte do canal. Crie o prompt visual da identidade do canal.\n\n${channelBrief(channel)}`,
      prompt: `${BRIEFS[kind]}\nEstilo visual do canal: ${channel.image_style}\nResponda com o prompt de imagem em inglês, sem texto, letras ou marcas d'água.`,
    });

    const dir = path.resolve(env.WORK_DIR, 'channels', channel.id);
    await mkdir(dir, { recursive: true });
    const stamp = Date.now();
    const raw = path.join(dir, `${kind}_raw.png`);
    const final = path.join(dir, `${kind}-${stamp}.jpg`);

    const provider = getImageProvider(channel.image_provider);
    await withRetry(() =>
      provider.generate({
        prompt: `${plan.image_prompt}, ${channel.image_style}, no text, no letters, no watermark`,
        search_query: plan.search_query,
        out_path: raw,
        seed: stamp % 997,
        aspect: kind === 'avatar' ? 'square' : 'landscape',
      }),
    );

    const text = AI_PROVIDERS.has(provider.name)
      ? undefined
      : kind === 'avatar'
        ? initials(channel.name)
        : channel.name.toUpperCase();
    await renderBranding({ image_path: raw, kind, text, out_path: final });

    const remote = await storage.upload(final, `channels/${channel.id}/${kind}-${stamp}.jpg`, 'image/jpeg');
    const previous = kind === 'avatar' ? channel.avatar_path : channel.banner_path;
    const updated = await channel_model.update(channel.id, kind === 'avatar' ? { avatar_path: remote } : { banner_path: remote });
    if (previous) await storage.remove(previous).catch(() => undefined);
    return updated;
  }
}

export const branding_service = new BrandingService();
