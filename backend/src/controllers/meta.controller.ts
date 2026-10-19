import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { PIPELINE_STAGES, STAGE_LABELS } from '../models/pipeline.js';
import { IMAGE_PROVIDERS } from '../providers/image/index.js';
import { TTS_PROVIDERS } from '../providers/tts/index.js';
import { youtube_provider } from '../providers/youtube/youtube.provider.js';

export const meta_controller = {
  health(_req: Request, res: Response) {
    res.json({ status: 'ok', time: new Date().toISOString() });
  },

  /** Opções que o painel usa para montar formulários. */
  options(_req: Request, res: Response) {
    res.json({
      data: {
        stages: PIPELINE_STAGES.map((stage) => ({ stage, label: STAGE_LABELS[stage] })),
        tts_providers: TTS_PROVIDERS,
        image_providers: IMAGE_PROVIDERS,
        llm_model: env.LLM_MODEL,
        integrations: {
          anthropic: Boolean(env.ANTHROPIC_API_KEY),
          openai: Boolean(env.OPENAI_API_KEY),
          elevenlabs: Boolean(env.ELEVENLABS_API_KEY),
          fal: Boolean(env.FAL_API_KEY),
          pexels: Boolean(env.PEXELS_API_KEY),
          youtube: youtube_provider.isConfigured(),
        },
        storage_driver: env.STORAGE_DRIVER,
      },
    });
  },
};
