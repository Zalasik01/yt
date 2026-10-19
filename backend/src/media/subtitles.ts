export interface AssStyle {
  width: number;
  height: number;
  font: string;
  font_size: number;
  primary_color?: string; // &HAABBGGRR
  outline?: number;
  alignment?: number; // numpad: 2 = base centro, 5 = meio, 7 = topo esquerda
  margin_v?: number;
  margin_h?: number;
  bold?: boolean;
}

export interface AssEvent {
  start: number;
  end: number;
  text: string;
  style?: string;
}

function toAssTime(seconds: number): string {
  const total_cs = Math.max(0, Math.round(seconds * 100));
  const h = Math.floor(total_cs / 360_000);
  const m = Math.floor((total_cs % 360_000) / 6000);
  const s = Math.floor((total_cs % 6000) / 100);
  const cs = total_cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function escapeAss(text: string): string {
  return text.replace(/\\/g, '').replace(/[{}]/g, '').replace(/\r?\n/g, '\\N');
}

function styleLine(name: string, style: AssStyle): string {
  return [
    `Style: ${name}`,
    style.font,
    style.font_size,
    style.primary_color ?? '&H00FFFFFF',
    '&H000000FF',
    '&H00000000',
    '&H80000000',
    style.bold === false ? 0 : -1,
    0, 0, 0, 100, 100, 0, 0,
    1, // border style: outline + sombra
    style.outline ?? 4,
    1,
    style.alignment ?? 2,
    style.margin_h ?? 60,
    style.margin_h ?? 60,
    style.margin_v ?? 70,
    1,
  ].join(',');
}

export function buildAss(styles: Record<string, AssStyle>, events: AssEvent[]): string {
  const first = Object.values(styles)[0]!;
  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${first.width}`,
    `PlayResY: ${first.height}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    ...Object.entries(styles).map(([name, style]) => styleLine(name, style)),
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...events.map(
      (event) =>
        `Dialogue: 0,${toAssTime(event.start)},${toAssTime(event.end)},${event.style ?? Object.keys(styles)[0]},,0,0,0,,${escapeAss(event.text)}`,
    ),
    '',
  ].join('\n');
}

/**
 * Quebra a narração em legendas curtas e distribui o tempo proporcionalmente
 * ao número de caracteres — preciso o bastante já que cada cena tem seu
 * próprio áudio (o erro nunca acumula entre cenas).
 */
export function chunkNarration(text: string, duration: number, max_words = 7, offset = 0): AssEvent[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let current: string[] = [];
  for (const word of words) {
    current.push(word);
    const ends_sentence = /[.!?…:;]$/.test(word);
    if (current.length >= max_words || (ends_sentence && current.length >= 3)) {
      chunks.push(current.join(' '));
      current = [];
    }
  }
  if (current.length) chunks.push(current.join(' '));

  const total_chars = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let cursor = offset;
  return chunks.map((chunk) => {
    const span = (chunk.length / total_chars) * duration;
    const event = { start: cursor, end: cursor + span, text: chunk };
    cursor += span;
    return event;
  });
}
