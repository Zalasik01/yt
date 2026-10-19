// Ordem fixa da linha de produção. Os 7 primeiros rodam automaticamente;
// "agenda" só roda depois da aprovação humana.
export const PIPELINE_STAGES = [
  'pauta',
  'roteiro',
  'narracao',
  'cenas',
  'montagem',
  'shorts',
  'thumbnail',
  'agenda',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PRODUCTION_STAGES = PIPELINE_STAGES.filter((stage) => stage !== 'agenda');

export const STAGE_LABELS: Record<PipelineStage, string> = {
  pauta: 'Pauta',
  roteiro: 'Roteiro',
  narracao: 'Narração',
  cenas: 'Cenas',
  montagem: 'Montagem',
  shorts: 'Shorts',
  thumbnail: 'Thumbnail',
  agenda: 'Agenda',
};

export function nextStage(stage: PipelineStage): PipelineStage | null {
  const index = PIPELINE_STAGES.indexOf(stage);
  return PIPELINE_STAGES[index + 1] ?? null;
}

export function stagesFrom(stage: PipelineStage): PipelineStage[] {
  return PIPELINE_STAGES.slice(PIPELINE_STAGES.indexOf(stage));
}
