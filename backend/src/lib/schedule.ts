/** Diferença (ms) entre o horário de parede no fuso e UTC, num instante. */
function timeZoneOffset(instant: number, time_zone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: time_zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const as_utc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return as_utc - Math.floor(instant / 1000) * 1000;
}

/** Converte data/hora de parede num fuso para Date em UTC (lida com horário de verão). */
export function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, time_zone: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - timeZoneOffset(guess, time_zone);
  const second = guess - timeZoneOffset(first, time_zone);
  return new Date(second);
}

function wallDate(instant: Date, time_zone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: time_zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export interface PublishWindow {
  time_zone: string;
  days: number[]; // 0 = domingo
  times: string[]; // HH:MM
}

/**
 * Próximo horário de publicação livre: respeita dias/horários do canal,
 * pula slots já ocupados e exige uma antecedência mínima.
 */
export function nextFreeSlot(
  window: PublishWindow,
  taken: Date[],
  { from = new Date(), min_lead_minutes = 60, horizon_days = 120 } = {},
): Date {
  const earliest = from.getTime() + min_lead_minutes * 60_000;
  const taken_set = new Set(taken.map((date) => Math.floor(date.getTime() / 60_000)));
  const times = [...window.times]
    .map((time) => time.split(':').map(Number) as [number, number])
    .sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]));
  const start = wallDate(from, window.time_zone);

  for (let offset = 0; offset <= horizon_days; offset++) {
    const day = new Date(Date.UTC(start.year, start.month - 1, start.day + offset));
    if (!window.days.includes(day.getUTCDay())) continue;
    for (const [hour, minute] of times) {
      const slot = zonedToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hour, minute, window.time_zone);
      if (slot.getTime() < earliest) continue;
      if (taken_set.has(Math.floor(slot.getTime() / 60_000))) continue;
      return slot;
    }
  }
  throw new Error('Nenhum horário livre na janela de publicação configurada');
}
