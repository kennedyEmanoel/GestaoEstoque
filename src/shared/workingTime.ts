interface Break {
  start: [number, number];
  end:   [number, number];
}

interface Shift {
  start:  [number, number];
  end:    [number, number];
  breaks: Break[];
}

const BREAKS: Break[] = [
  { start: [9, 30],  end: [9, 55]  }, 
  { start: [12, 0],  end: [13, 0]  }, 
];

const SHIFT_DEFAULT: Shift = { start: [7, 12], end: [17, 12], breaks: BREAKS };
const SHIFT_FRIDAY:  Shift = { start: [7, 12], end: [16, 12], breaks: BREAKS };

function getShift(dow: number): Shift | null {
  if (dow === 0 || dow === 6) return null;  
  if (dow === 5) return SHIFT_FRIDAY;       
  return SHIFT_DEFAULT;                     
}

function toAbsMs(dayDate: Date, h: number, m: number): number {
  const d = new Date(dayDate);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function workingMsInDay(dayDate: Date, periodStart: number, periodEnd: number): number {
  const dow   = dayDate.getDay();
  const shift = getShift(dow);
  if (!shift) return 0;

  const shiftStart = toAbsMs(dayDate, shift.start[0], shift.start[1]);
  const shiftEnd   = toAbsMs(dayDate, shift.end[0],   shift.end[1]);

  const overlapStart = Math.max(periodStart, shiftStart);
  const overlapEnd   = Math.min(periodEnd,   shiftEnd);
  if (overlapStart >= overlapEnd) return 0;

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

export function calcWorkingSeconds(startMs: number, endMs: number): number {
  if (endMs <= startMs) return 0;

  let totalMs = 0;

  const cursor = new Date(startMs);
  cursor.setHours(0, 0, 0, 0); 

  const lastDay = new Date(endMs);
  lastDay.setHours(23, 59, 59, 999);

  while (cursor <= lastDay) {
    totalMs += workingMsInDay(cursor, startMs, endMs);
    cursor.setDate(cursor.getDate() + 1);
  }

  return Math.floor(totalMs / 1000);
}

export function formatWorkingTime(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
