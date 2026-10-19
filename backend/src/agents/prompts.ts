import type { Channel } from '../models/entities.js';

/** Contexto fixo do canal — vai no system prompt de todos os agentes. */
export function channelBrief(channel: Channel): string {
  return [
    `Canal: ${channel.name}`,
    `Nicho: ${channel.niche}`,
    channel.description ? `Descrição: ${channel.description}` : null,
    `Idioma do conteúdo: ${channel.language}`,
    `Tom de voz: ${channel.tone}`,
    `Duração alvo do vídeo longo: ${channel.target_duration_minutes} minutos`,
  ]
    .filter(Boolean)
    .join('\n');
}

export const FACTORY_SYSTEM = `Você faz parte de uma equipe que produz vídeos para um canal "dark" do YouTube
(canal sem rosto: narração + imagens). O conteúdo precisa ser original, factual quando trata
de fatos reais, e seguro para monetização (sem violência gráfica, sem discurso de ódio,
sem desinformação). Escreva sempre no idioma do canal.`;
