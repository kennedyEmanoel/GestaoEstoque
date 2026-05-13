import { db } from '../models/db';
import { box, STOCK_LOCATIONS } from '../models/schema/box';
import type { BoxPrefix, ProductionStep, BoxLocation } from '../models/schema/box';
import { history } from '../models/schema/history';
import { eq, isNull, and } from 'drizzle-orm';
import type { NewBoxInput, ScanInput, StockSummary } from '../../shared/types';

// ─── Máquina de Estados ──────────────────────────────────────────────────────

const ID_REGEX = /^(BDJ|NB2|4GS|LOR|NBL)\d{4,}$/;

// Mapa de transições válidas por prefixo.
// Cada etapa aponta para as etapas que podem vir depois dela.
// 4GS tem fork após Revisao: pode ir para IMEI ou Firmware em qualquer ordem.
type TransitionMap = Partial<Record<ProductionStep, ProductionStep[]>>;

const DEFAULT_TRANSITIONS: TransitionMap = {
  'Montagem':  ['Soldagem'],
  'Soldagem':  ['Revisao'],
  'Revisao':   ['Firmware'],
  'Firmware':  ['IMEI'],
  'IMEI':      ['Concluida'],
};

const TRANSITIONS_4GS: TransitionMap = {
  'Montagem':  ['Soldagem'],
  'Soldagem':  ['Revisao'],
  'Revisao':   ['IMEI', 'Firmware'],   // fork: qualquer um dos dois
  'IMEI':      ['Firmware', 'Concluida'], // se IMEI primeiro, próximo é Firmware ou Concluida
  'Firmware':  ['IMEI', 'Concluida'],     // se Firmware primeiro, próximo é IMEI ou Concluida
};

function getTransitions(boxId: string): TransitionMap {
  const prefix = boxId.substring(0, 3) as BoxPrefix;
  return prefix === '4GS' ? TRANSITIONS_4GS : DEFAULT_TRANSITIONS;
}

function getNextSteps(boxId: string, currentStep: ProductionStep): ProductionStep[] {
  return getTransitions(boxId)[currentStep] ?? [];
}

function isValidTransition(boxId: string, from: ProductionStep, to: ProductionStep): boolean {
  return getNextSteps(boxId, from).includes(to);
}

// ─── createBox ───────────────────────────────────────────────────────────────

export async function createBox(data: NewBoxInput) {
  const cleanId = data.id.trim().toUpperCase();

  if (!ID_REGEX.test(cleanId)) {
    throw new Error('ID inválido. Use prefixos BDJ, NB2, 4GS, LOR ou NBL.');
  }

  const prefix = cleanId.substring(0, 3) as BoxPrefix;
  const origin = prefix === 'BDJ' ? 'TRAY' : 'PRODUCTION';
  const firstStep: ProductionStep = 'Montagem';

  try {
    const result = await db.insert(box).values({
      id: cleanId,
      weight: data.weight,
      amount: data.amount ?? 500,
      model: data.model,
      operator: data.operator,
      description: data.description,
      volume: data.volume,
      origin,
      step: data.step ?? firstStep,
      location: data.location ?? 'ESTOQUE',
    }).returning();

    return result[0];
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error(`O código ${cleanId} já existe.`);
    }
    throw new Error(`Erro ao criar caixa: ${error.message}`);
  }
}

// ─── getBoxById ──────────────────────────────────────────────────────────────

export async function getBoxById(id: string) {
  const cleanId = id.trim().toUpperCase();
  const result = await db.select().from(box).where(eq(box.id, cleanId)).limit(1);

  if (result.length === 0) {
    throw new Error(`Código '${cleanId}' não encontrado.`);
  }
  return result[0];
}

// ─── scanBox (bipagem) ───────────────────────────────────────────────────────

/**
 * Registra uma bipagem de caixa.
 * - Valida a transição de etapa pela máquina de estados.
 * - Se existir um registro de history aberto (sem endTime), fecha ele antes.
 * - Cria um novo registro SCAN_START.
 * - Atualiza step e location da caixa.
 */
export async function scanBox(data: ScanInput) {
  const cleanId = data.boxId.trim().toUpperCase();

  const [currentBox] = await db.select().from(box).where(eq(box.id, cleanId)).limit(1);
  if (!currentBox) {
    throw new Error(`Caixa '${cleanId}' não encontrada.`);
  }

  const currentStep = currentBox.step as ProductionStep;
  if (currentStep === 'Concluida') {
    throw new Error(`A caixa '${cleanId}' já está concluída.`);
  }

  if (!isValidTransition(cleanId, currentStep, data.step)) {
    const nextSteps = getNextSteps(cleanId, currentStep);
    throw new Error(
      `Transição inválida: '${currentStep}' → '${data.step}'. ` +
      `Próximas etapas válidas: ${nextSteps.length ? nextSteps.join(' ou ') : 'nenhuma'}.`
    );
  }

  const now = new Date();

  // Fecha registro aberto, se existir
  const [openRecord] = await db
    .select()
    .from(history)
    .where(and(eq(history.boxId, cleanId), isNull(history.endTime)))
    .limit(1);

  if (openRecord) {
    const startMs = openRecord.startTime instanceof Date
      ? openRecord.startTime.getTime()
      : (openRecord.startTime as number) * 1000;
    const timeSpent = Math.floor((now.getTime() - startMs) / 1000);

    await db
      .update(history)
      .set({ endTime: now, timeSpent })
      .where(eq(history.id, openRecord.id));
  }

  // Cria novo registro SCAN_START
  const [newRecord] = await db.insert(history).values({
    boxId: cleanId,
    startTime: now,
    typeOperation: 'SCAN_START',
    step: data.step,
    location: data.location,
    operator: data.operator,
    description: data.description ?? null,
  }).returning();

  // Atualiza a caixa
  await db
    .update(box)
    .set({ step: data.step, location: data.location, operator: data.operator })
    .where(eq(box.id, cleanId));

  return {
    box: { ...currentBox, step: data.step, location: data.location, operator: data.operator },
    historyRecord: newRecord,
    closedPreviousRecord: openRecord ? openRecord.id : null,
  };
}

// ─── finishStep ──────────────────────────────────────────────────────────────

/**
 * Fecha manualmente o registro aberto de uma caixa, calculando o timeSpent.
 */
export async function finishStep(boxId: string, operator: string) {
  const cleanId = boxId.trim().toUpperCase();
  const now = new Date();

  const [openRecord] = await db
    .select()
    .from(history)
    .where(and(eq(history.boxId, cleanId), isNull(history.endTime)))
    .limit(1);

  if (!openRecord) {
    throw new Error(`Nenhuma etapa aberta encontrada para a caixa '${cleanId}'.`);
  }

  const startMs = openRecord.startTime instanceof Date
    ? openRecord.startTime.getTime()
    : (openRecord.startTime as number) * 1000;
  const timeSpent = Math.floor((now.getTime() - startMs) / 1000);

  const [closed] = await db
    .update(history)
    .set({ endTime: now, timeSpent, operator })
    .where(eq(history.id, openRecord.id))
    .returning();

  return closed;
}

// ─── getBoxHistory ────────────────────────────────────────────────────────────

export async function getBoxHistory(boxId: string) {
  const cleanId = boxId.trim().toUpperCase();
  return db
    .select()
    .from(history)
    .where(eq(history.boxId, cleanId))
    .orderBy(history.startTime);
}

// ─── getStockSummary ──────────────────────────────────────────────────────────

export async function getStockSummary(): Promise<StockSummary> {
  const allBoxes = await db.select({ location: box.location, step: box.step }).from(box);

  const byLocation: Record<string, number> = {};
  const byStep: Partial<Record<ProductionStep, number>> = {};
  let inStock = 0;
  let inProduction = 0;

  for (const b of allBoxes) {
    const loc = b.location ?? 'ESTOQUE';
    byLocation[loc] = (byLocation[loc] ?? 0) + 1;

    const step = b.step as ProductionStep;
    byStep[step] = (byStep[step] ?? 0) + 1;

    if (STOCK_LOCATIONS.includes(loc as BoxLocation)) {
      inStock++;
    } else {
      inProduction++;
    }
  }

  return { inStock, inProduction, byLocation, byStep };
}
