export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '--:--';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export const STATUS_LABELS: Record<string, string> = {
  queued: 'Na fila',
  in_production: 'Em produção',
  awaiting_approval: 'Aguardando aprovação',
  approved: 'Aprovado',
  scheduled: 'Agendado',
  published: 'Publicado',
  rejected: 'Reprovado',
  failed: 'Falhou',
};

export const STAGE_COLORS: Record<string, string> = {
  pauta: '#4f7cff',
  roteiro: '#a35cff',
  narracao: '#ff4fa3',
  cenas: '#ff8a3d',
  montagem: '#2ec4ff',
  shorts: '#4be36b',
  thumbnail: '#ff5a5a',
  agenda: '#ffd60a',
};

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
