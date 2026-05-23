import { db } from '../models/db';
import { box, STOCK_LOCATIONS } from '../models/schema/box';
import { history } from '../models/schema/history';
import type { ProductionStep, BoxLocation } from '../models/schema/box';
import { calcWorkingSeconds } from '../../shared/workingTime';
import { gte, lte, and, eq, isNotNull, inArray } from 'drizzle-orm';

export interface DashboardFilters {
  model?: string;       // filtro por modelo (null = todos)
  dateFrom?: number;    // timestamp ms
  dateTo?: number;      // timestamp ms
}

export interface StepFunnel {
  step: ProductionStep;
  totalUnits: number;      // soma de amount das caixas nessa etapa
  boxesInStock: number;    // caixas paradas em local de estoque
  boxesActive: number;     // caixas em posto de produção
  avgLeadTimeSec: number;  // tempo médio em serviço nessa etapa (histórico fechado)
}

export interface DashboardData {
  // KPIs de inventário
  totalUnitsInStock: number;
  totalUnitsInProduction: number;
  byModel: { model: string; unitsInStock: number; unitsInProduction: number }[];

  // Funil por etapa
  funnel: StepFunnel[];

  // KPIs industriais
  avgLeadTimeSec: number;       // lead time médio do ciclo completo (Montagem → Concluida)
  uphLast8h: number;            // unidades por hora (últimas 8h de trabalho)
  bottleneckStep: ProductionStep | null; // etapa com maior tempo médio

  // Modelos disponíveis para filtro
  availableModels: string[];
}

const PRODUCTION_STEPS: ProductionStep[] = [
  'Montagem', 'Soldagem', 'Revisao', 'Firmware', 'IMEI', 'Concluida',
];

export function getDashboardData(filters: DashboardFilters): DashboardData {
  // ── 1. Caixas filtradas via SQL (evita full scan em memória) ─────────────
  const conditions = [];
  if (filters.model)    conditions.push(eq(box.model, filters.model));
  if (filters.dateFrom) conditions.push(gte(box.date, new Date(filters.dateFrom)));
  if (filters.dateTo)   conditions.push(lte(box.date, new Date(filters.dateTo)));

  const filtered = conditions.length > 0
    ? db.select().from(box).where(and(...conditions)).all()
    : db.select().from(box).all();

  const allBoxes = filtered; // manter compatibilidade com uso abaixo

  const boxIds = filtered.map(b => b.id);

  // ── 2. KPIs de inventário ────────────────────────────────────────────────
  let totalUnitsInStock = 0;
  let totalUnitsInProduction = 0;
  const modelMap: Record<string, { inStock: number; inProduction: number }> = {};

  for (const b of filtered) {
    const loc = (b.location ?? 'ESTOQUE') as BoxLocation;
    const isStock = STOCK_LOCATIONS.includes(loc);
    const units = b.amount ?? 0;
    const model = b.model ?? 'Sem modelo';

    if (!modelMap[model]) modelMap[model] = { inStock: 0, inProduction: 0 };

    if (isStock) {
      totalUnitsInStock += units;
      modelMap[model].inStock += units;
    } else {
      totalUnitsInProduction += units;
      modelMap[model].inProduction += units;
    }
  }

  const byModel = Object.entries(modelMap).map(([model, v]) => ({
    model,
    unitsInStock: v.inStock,
    unitsInProduction: v.inProduction,
  }));

  // ── 3. Funil por etapa ───────────────────────────────────────────────────
  // Histórico fechado para calcular tempo médio por etapa
  const closedHistory = boxIds.length > 0
    ? db.select().from(history)
        .where(and(
          inArray(history.boxId, boxIds),
          isNotNull(history.endTime),
        ))
        .all()
    : [];

  const stepAvgMap: Record<string, { totalSec: number; count: number }> = {};

  for (const h of closedHistory) {
    const startMs = h.startTime instanceof Date
      ? h.startTime.getTime() : (h.startTime as number) * 1000;
    const endMs = h.endTime instanceof Date
      ? h.endTime.getTime() : (h.endTime as unknown as number) * 1000;

    const worked = calcWorkingSeconds(startMs, endMs);
    if (!stepAvgMap[h.step]) stepAvgMap[h.step] = { totalSec: 0, count: 0 };
    stepAvgMap[h.step].totalSec += worked;
    stepAvgMap[h.step].count += 1;
  }

  const funnel: StepFunnel[] = PRODUCTION_STEPS.map(step => {
    const boxesInStep = filtered.filter(b => b.step === step);
    const totalUnits = boxesInStep.reduce((s, b) => s + (b.amount ?? 0), 0);
    const boxesInStock = boxesInStep.filter(b =>
      STOCK_LOCATIONS.includes((b.location ?? 'ESTOQUE') as BoxLocation)
    ).length;
    const boxesActive = boxesInStep.length - boxesInStock;
    const avg = stepAvgMap[step];
    const avgLeadTimeSec = avg && avg.count > 0 ? Math.round(avg.totalSec / avg.count) : 0;

    return { step, totalUnits, boxesInStock, boxesActive, avgLeadTimeSec };
  });

  // ── 4. Lead time médio do ciclo completo ────────────────────────────────
  // Usa caixas concluídas: tempo entre primeiro e último registro de history
  const concludedBoxIds = filtered
    .filter(b => b.step === 'Concluida')
    .map(b => b.id);

  let avgLeadTimeSec = 0;

  if (concludedBoxIds.length > 0) {
    const concludedHistory = db.select().from(history)
      .where(inArray(history.boxId, concludedBoxIds))
      .all();

    const perBox: Record<string, { first: number; last: number }> = {};
    for (const h of concludedHistory) {
      const ts = h.startTime instanceof Date
        ? h.startTime.getTime() : (h.startTime as number) * 1000;
      if (!perBox[h.boxId]) perBox[h.boxId] = { first: ts, last: ts };
      if (ts < perBox[h.boxId].first) perBox[h.boxId].first = ts;
      if (ts > perBox[h.boxId].last)  perBox[h.boxId].last  = ts;
    }

    const leadTimes = Object.values(perBox).map(({ first, last }) =>
      calcWorkingSeconds(first, last)
    );
    if (leadTimes.length > 0) {
      avgLeadTimeSec = Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length);
    }
  }

  // ── 5. UPH — últimas 8h de trabalho efetivo ──────────────────────────────
  // Percorre para trás a partir de agora até acumular 8h de jornada
  const now = Date.now();
  const eightHoursMs = 8 * 3600 * 1000;
  const windowStart = now - 7 * 24 * 3600 * 1000; // máximo 7 dias atrás para busca

  const recentClosed = db.select().from(history)
    .where(and(
      isNotNull(history.endTime),
      boxIds.length > 0 ? inArray(history.boxId, boxIds) : undefined,
    ))
    .all()
    .filter(h => {
      const endMs = h.endTime instanceof Date
        ? h.endTime.getTime() : (h.endTime as unknown as number) * 1000;
      return endMs >= windowStart && endMs <= now;
    });

  // Soma unidades das caixas cujo último scan foi concluído nessa janela
  const recentBoxIds = [...new Set(recentClosed.map(h => h.boxId))];
  const recentBoxes = filtered.filter(b => recentBoxIds.includes(b.id));
  const unitsInWindow = recentBoxes.reduce((s, b) => s + (b.amount ?? 0), 0);

  // Horas trabalhadas efetivas na janela
  const workedSecondsWindow = calcWorkingSeconds(now - eightHoursMs * 7, now);
  const workedHours = workedSecondsWindow / 3600;
  const uphLast8h = workedHours > 0 ? Math.round(unitsInWindow / workedHours) : 0;

  // ── 6. Gargalo ───────────────────────────────────────────────────────────
  let bottleneckStep: ProductionStep | null = null;
  let maxAvg = 0;
  for (const f of funnel) {
    if (f.step !== 'Concluida' && f.avgLeadTimeSec > maxAvg) {
      maxAvg = f.avgLeadTimeSec;
      bottleneckStep = f.step;
    }
  }

  // ── 7. Modelos disponíveis ───────────────────────────────────────────────
  const availableModels = [...new Set(
    allBoxes.map(b => b.model).filter(Boolean) as string[]
  )].sort();

  return {
    totalUnitsInStock,
    totalUnitsInProduction,
    byModel,
    funnel,
    avgLeadTimeSec,
    uphLast8h,
    bottleneckStep,
    availableModels,
  };
}
