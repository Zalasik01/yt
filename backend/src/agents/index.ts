import type { PipelineStage } from '../models/pipeline.js';
import type { Agent } from './agent.types.js';
import { AgendaAgent } from './agenda.agent.js';
import { CenasAgent } from './cenas.agent.js';
import { MontagemAgent } from './montagem.agent.js';
import { NarracaoAgent } from './narracao.agent.js';
import { PautaAgent } from './pauta.agent.js';
import { RoteiroAgent } from './roteiro.agent.js';
import { ShortsAgent } from './shorts.agent.js';
import { ThumbnailAgent } from './thumbnail.agent.js';

const agents: Record<PipelineStage, Agent> = {
  pauta: new PautaAgent(),
  roteiro: new RoteiroAgent(),
  narracao: new NarracaoAgent(),
  cenas: new CenasAgent(),
  montagem: new MontagemAgent(),
  shorts: new ShortsAgent(),
  thumbnail: new ThumbnailAgent(),
  agenda: new AgendaAgent(),
};

export function getAgent(stage: PipelineStage): Agent {
  return agents[stage];
}
