// Minutos desde meia-noite
function toMin(h: number, m: number): number {
  return h * 60 + m;
}

// Blocos de trabalho por tipo de dia [início, fim, pausa em minutos]
const BLOCKS_MON_THU: [number, number, number][] = [
  [toMin(7, 12), toMin(12, 0),  15], // manhã
  [toMin(13, 0), toMin(17, 12), 10], // tarde
];

const BLOCKS_FRI: [number, number, number][] = [
  [toMin(7, 12), toMin(12, 0),  15], // manhã
  [toMin(13, 0), toMin(16, 12), 10], // tarde
];

function getDayBlocks(date: Date): [number, number, number][] | null {
  const dow = date.getDay(); // 0=Dom … 6=Sab
  if (dow === 0 || dow === 6) return null;
  if (dow === 5) return BLOCKS_FRI;
  return BLOCKS_MON_THU;
}

// Minutos trabalhados em um único dia, no intervalo [rangeStart, rangeEnd] (minutos desde meia-noite)
function workedMinutesInDay(blocks: [number, number, number][], rangeStart: number, rangeEnd: number): number {
  let total = 0;
  for (const [blockStart, blockEnd, breakMins] of blocks) {
    const from = Math.max(rangeStart, blockStart);
    const to   = Math.min(rangeEnd,   blockEnd);
    if (to <= from) continue;

    const blockDuration = blockEnd - blockStart;
    const overlap       = to - from;
    // Desconta pausa proporcionalmente ao trecho coberto
    total += overlap - (overlap / blockDuration) * breakMins;
  }
  return total;
}

/**
 * Calcula segundos de "Tempo em Serviço" entre dois timestamps,
 * respeitando jornada, almoço e pausas. Fins de semana são ignorados.
 */
export function calcWorkingSeconds(startMs: number, endMs: number): number {
  if (endMs <= startMs) return 0;

  let totalMinutes = 0;

  // Itera dia a dia
  const cursor = new Date(startMs);
  cursor.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= endMs) {
    const blocks = getDayBlocks(cursor);
    if (blocks) {
      const dayStart = cursor.getTime();
      // Converte os limites do intervalo para minutos dentro deste dia
      const rangeStart = Math.max(0,    (startMs - dayStart) / 60000);
      const rangeEnd   = Math.min(1440, (endMs   - dayStart) / 60000);
      totalMinutes += workedMinutesInDay(blocks, rangeStart, rangeEnd);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return Math.round(totalMinutes * 60);
}

/**
 * Formata segundos de tempo em serviço. Ex: "2h 34m 10s"
 */
export function formatWorkingTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
