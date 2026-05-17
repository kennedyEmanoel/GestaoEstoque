/**
 * Calendário industrial para cálculo de tempo líquido de produção.
 *
 * Jornada:
 *   Seg–Qui  07:12–17:12  (10h brutas)
 *   Sexta    07:12–16:12  (9h brutas)
 *   Sáb/Dom  não trabalhado
 *
 * Descontos fixos diários (se o período intersectar a janela):
 *   Café:   09:30–09:55  (25 min)
 *   Almoço: 12:00–13:00  (60 min)
 */

interface Break {
  start: [number, number]; // [hora, minuto]
  end:   [number, number];
}

interface Shift {
  start:  [number, number];
  end:    [number, number];
  breaks: Break[];
}

const BREAKS: Break[] = [
  { start: [9, 30],  end: [9, 55]  }, // café   25 min
  { start: [12, 0],  end: [13, 0]  }, // almoço 60 min
];

const SHIFT_DEFAULT: Shift = { start: [7, 12], end: [17, 12], breaks: BREAKS };
const SHIFT_FRIDAY:  Shift = { start: [7, 12], end: [16, 12], breaks: BREAKS };

function getShift(dow: number): Shift | null {
  if (dow === 0 || dow === 6) return null;  // domingo, sábado
  if (dow === 5) return SHIFT_FRIDAY;       // sexta
  return SHIFT_DEFAULT;                     // seg–qui
}

/** Converte [hora, minuto] em ms absolutos dentro de um Date (respeita timezone local). */
function toAbsMs(dayDate: Date, h: number, m: number): number {
  const d = new Date(dayDate);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/** Milissegundos de trabalho líquido em um único dia calendário. */
function workingMsInDay(dayDate: Date, periodStart: number, periodEnd: number): number {
  const dow   = dayDate.getDay();
  const shift = getShift(dow);
  if (!shift) return 0;

  const shiftStart = toAbsMs(dayDate, shift.start[0], shift.start[1]);
  const shiftEnd   = toAbsMs(dayDate, shift.end[0],   shift.end[1]);

  // Sobreposição do período com o expediente
  const overlapStart = Math.max(periodStart, shiftStart);
  const overlapEnd   = Math.min(periodEnd,   shiftEnd);
  if (overlapStart >= overlapEnd) return 0;

  // Desconta cada intervalo que intersecta o overlap
  let breakMs = 0;
  for (const br of shift.breaks) {
    const bStart = toAbsMs(dayDate, br.start[0], br.start[1]);
    const bEnd   = toAbsMs(dayDate, br.end[0],   br.end[1]);
    const bs = Math.max(overlapStart, bStart);
    const be = Math.min(overlapEnd,   bEnd);
    if (be > bs) breakMs += be - bs;
  }

  return overlapEnd - overlapStart - breakMs;
}

/**
 * Retorna segundos de trabalho líquido entre dois timestamps (ms),
 * ignorando madrugadas, fins de semana e intervalos obrigatórios.
 */
export function calcWorkingSeconds(startMs: number, endMs: number): number {
  if (endMs <= startMs) return 0;

  let totalMs = 0;

  const cursor = new Date(startMs);
  cursor.setHours(0, 0, 0, 0); // início do primeiro dia

  const lastDay = new Date(endMs);
  lastDay.setHours(23, 59, 59, 999);

  while (cursor <= lastDay) {
    totalMs += workingMsInDay(cursor, startMs, endMs);
    cursor.setDate(cursor.getDate() + 1);
  }

  return Math.floor(totalMs / 1000);
}

/** Formata segundos de tempo líquido. Ex: "2h 34m 10s" */
export function formatWorkingTime(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
