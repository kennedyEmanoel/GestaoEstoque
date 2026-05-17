import { db } from '../models/db';
import { box, STOCK_LOCATIONS } from '../models/schema/box';
import type { BoxPrefix, ProductionStep, BoxLocation } from '../models/schema/box';
import { history } from '../models/schema/history';
import { eq, and, or, isNull, desc, like, max } from 'drizzle-orm';
import type { NewBoxInput, StartStepInput, StockSummary, BatchBoxInput, ExpedicaoInput } from '../../shared/types';
import { calcWorkingSeconds } from '../../shared/workingTime';

// ─── Mapeamento de Produto por Prefixo ───────────────────────────────────────

const ID_REGEX = /^(BDJ|NB2|4GS|LOR|NBL|INS)\d{4,}$/;

const PREFIX_TO_MODEL: Partial<Record<BoxPrefix, string>> = {
  'NB2': 'NB2',
  '4GS': '4G SIMCOM',
  'LOR': 'LORA',
  'NBL': 'NB + LORA',
  'INS': 'Insumo',
};

// ─── Máquina de Estados ──────────────────────────────────────────────────────

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
  'Revisao':   ['IMEI', 'Firmware'],
  'IMEI':      ['Firmware', 'Concluida'],
  'Firmware':  ['IMEI', 'Concluida'],
};

// INS só pode avançar para Montagem
const TRANSITIONS_INS: TransitionMap = {
  'Separacao': ['Montagem'],
};

function getTransitions(boxId: string): TransitionMap {
  const prefix = boxId.substring(0, 3) as BoxPrefix;
  if (prefix === '4GS') return TRANSITIONS_4GS;
  if (prefix === 'INS') return TRANSITIONS_INS;
  return DEFAULT_TRANSITIONS;
}

function getNextSteps(boxId: string, currentStep: ProductionStep): ProductionStep[] {
  return getTransitions(boxId)[currentStep] ?? [];
}

function isValidTransition(boxId: string, from: ProductionStep, to: ProductionStep): boolean {
  return getNextSteps(boxId, from).includes(to);
}

// ─── createBox ───────────────────────────────────────────────────────────────

export function createBox(data: NewBoxInput) {
  const cleanId = data.id.trim().toUpperCase();

  if (!ID_REGEX.test(cleanId)) {
    throw new Error('ID inválido. Use prefixos BDJ, NB2, 4GS, LOR, NBL ou INS.');
  }

  const prefix = cleanId.substring(0, 3) as BoxPrefix;
  const isInsumo = prefix === 'INS';
  const origin = prefix === 'BDJ' ? 'TRAY' : 'PRODUCTION';
  const firstStep: ProductionStep = isInsumo ? 'Separacao' : 'Montagem';

  const model = PREFIX_TO_MODEL[prefix] ?? null;
  if (origin === 'PRODUCTION' && !model) {
    throw new Error(`Prefixo '${prefix}' não possui produto mapeado.`);
  }

  const amount = isInsumo ? 450 : (data.amount ?? 500);

  return db.transaction((tx) => {
    try {
      const [result] = tx.insert(box).values({
        id: cleanId,
        weight: data.weight ?? 0,
        amount,
        model,
        operator: data.operator,
        description: data.description,
        volume: data.volume,
        origin,
        step: isInsumo ? firstStep : (data.step ?? firstStep),
        location: data.location ?? 'ESTOQUE',
      }).returning().all();

      return result;
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`O código ${cleanId} já existe.`);
      }
      throw new Error(`Erro ao criar caixa: ${error.message}`);
    }
  });
}

// ─── getNextBatchIds ──────────────────────────────────────────────────────────

export function getNextBatchIds(prefix: BoxPrefix, count: number): string[] {
  const pattern = `${prefix}%`;
  const [row] = db
    .select({ maxId: max(box.id) })
    .from(box)
    .where(like(box.id, pattern))
    .all();

  let next = 1;
  if (row?.maxId) {
    const num = parseInt(row.maxId.substring(3), 10);
    if (!isNaN(num)) next = num + 1;
  }

  return Array.from({ length: count }, (_, i) =>
    `${prefix}${String(next + i).padStart(4, '0')}`
  );
}

// ─── createBatchBoxes ─────────────────────────────────────────────────────────

export function createBatchBoxes(data: BatchBoxInput) {
  return db.transaction((tx) => {
    const results = [];
    for (const id of data.ids) {
      const cleanId = id.trim().toUpperCase();
      if (!ID_REGEX.test(cleanId)) throw new Error(`ID inválido: ${cleanId}`);

      const prefix = cleanId.substring(0, 3) as BoxPrefix;
      const isInsumo = prefix === 'INS';
      const origin = prefix === 'BDJ' ? 'TRAY' : 'PRODUCTION';
      const model = isInsumo ? (data.model ?? null) : (PREFIX_TO_MODEL[prefix] ?? null);
      if (origin === 'PRODUCTION' && !model) throw new Error(`Prefixo '${prefix}' sem produto mapeado.`);

      const amount = isInsumo ? 450 : (data.amount ?? 500);
      const step: ProductionStep = isInsumo ? 'Separacao' : (data.step ?? 'Montagem');

      try {
        const [row] = tx.insert(box).values({
          id: cleanId,
          weight: data.weight ?? 0,
          amount,
          model,
          operator: data.operator,
          description: data.description,
          volume: data.volume ?? null,
          origin,
          step,
          location: data.location ?? 'ESTOQUE',
        }).returning().all();
        results.push(row);
      } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed'))
          throw new Error(`O código ${cleanId} já existe.`);
        throw new Error(`Erro ao criar caixa ${cleanId}: ${error.message}`);
      }
    }
    return results;
  });
}

// ─── deleteBox ───────────────────────────────────────────────────────────────

export function deleteBox(id: string) {
  const cleanId = id.trim().toUpperCase();
  return db.transaction((tx) => {
    tx.delete(history).where(eq(history.boxId, cleanId)).run();
    const result = tx.delete(box).where(eq(box.id, cleanId)).run();
    if (result.changes === 0) {
      throw new Error(`Caixa '${cleanId}' não encontrada.`);
    }
  });
}

// ─── deleteManyBoxes ─────────────────────────────────────────────────────────

export function deleteManyBoxes(prefix: BoxPrefix | 'ALL') {
  return db.transaction((tx) => {
    if (prefix === 'ALL') {
      tx.delete(history).run();
      const result = tx.delete(box).run();
      return result.changes;
    }

    const pattern = `${prefix}%`;
    const targets = tx
      .select({ id: box.id })
      .from(box)
      .where(like(box.id, pattern))
      .all()
      .map((r) => r.id);

    if (targets.length === 0) return 0;

    for (const id of targets) {
      tx.delete(history).where(eq(history.boxId, id)).run();
    }
    const result = tx.delete(box).where(like(box.id, pattern)).run();
    return result.changes;
  });
}

// ─── getBoxById ──────────────────────────────────────────────────────────────

export function getBoxById(id: string) {
  const cleanId = id.trim().toUpperCase();
  const [result] = db.select().from(box).where(eq(box.id, cleanId)).limit(1).all();

  if (!result) {
    throw new Error(`Código '${cleanId}' não encontrado.`);
  }
  return result;
}

// ─── startStep (iniciar etapa) ───────────────────────────────────────────────

export function startStep(data: StartStepInput) {
  const cleanId = data.boxId.trim().toUpperCase();

  const [currentBox] = db.select().from(box).where(eq(box.id, cleanId)).limit(1).all();
  if (!currentBox) {
    throw new Error(`Caixa '${cleanId}' não encontrada.`);
  }

  const currentStep = currentBox.step as ProductionStep;
  if (currentStep === 'Concluida') {
    throw new Error(`A caixa '${cleanId}' já está concluída.`);
  }

  // Bloqueio: impede iniciar nova etapa se a anterior ainda está OPEN ou sem endTime
  const [openRecord] = db
    .select()
    .from(history)
    .where(and(
      eq(history.boxId, cleanId),
      or(eq(history.stepStatus, 'OPEN'), isNull(history.endTime))
    ))
    .limit(1)
    .all();

  if (openRecord) {
    throw new Error(
      `Bloqueado: a etapa "${openRecord.step}" ainda está em andamento para "${cleanId}". ` +
      `Finalize essa etapa antes de iniciar "${data.step}".`
    );
  }

  if (!isValidTransition(cleanId, currentStep, data.step)) {
    const next = getNextSteps(cleanId, currentStep);
    throw new Error(
      `Transição inválida: "${currentStep}" → "${data.step}". ` +
      `Próximas etapas válidas: ${next.length ? next.join(' ou ') : 'nenhuma'}.`
    );
  }

  const now = new Date();

  return db.transaction((tx) => {
    const [newRecord] = tx.insert(history).values({
      boxId: cleanId,
      startTime: now,
      typeOperation: 'SCAN_START',
      stepStatus: 'OPEN',
      step: data.step,
      location: data.location,
      operator: data.operator,
      description: data.description ?? null,
    }).returning().all();

    tx.update(box)
      .set({ step: data.step, location: data.location, operator: data.operator })
      .where(eq(box.id, cleanId))
      .run();

    return {
      box: { ...currentBox, step: data.step, location: data.location, operator: data.operator },
      historyRecord: newRecord,
    };
  });
}

// ─── finishStep ──────────────────────────────────────────────────────────────

export function finishStep(boxId: string, operator: string, stockLocation: BoxLocation = 'ESTOQUE') {
  const cleanId = boxId.trim().toUpperCase();
  const now = new Date();

  const [openRecord] = db
    .select()
    .from(history)
    .where(and(
      eq(history.boxId, cleanId),
      or(eq(history.stepStatus, 'OPEN'), isNull(history.endTime))
    ))
    .limit(1)
    .all();

  if (!openRecord) {
    throw new Error(
      `Nenhuma etapa em andamento para a caixa "${cleanId}". Inicie uma etapa antes de finalizar.`
    );
  }

  const startMs = openRecord.startTime instanceof Date
    ? openRecord.startTime.getTime()
    : (openRecord.startTime as number) * 1000;

  // Tempo líquido respeitando calendário industrial
  const timeSpent = calcWorkingSeconds(startMs, now.getTime());

  const isInsumoFinishingMontagem =
    cleanId.startsWith('INS') && openRecord.step === 'Montagem';

  return db.transaction((tx) => {
    const [closed] = tx
      .update(history)
      .set({
        endTime: now,
        timeSpent,
        stepStatus: 'CLOSED',
        typeOperation: 'SCAN_END',
        operator,
      })
      .where(eq(history.id, openRecord.id))
      .returning()
      .all();

    if (isInsumoFinishingMontagem) {
      // Caixa reutilizável: reset do conteúdo, volta a Separacao no estoque
      tx.update(box)
        .set({
          step: 'Separacao',
          location: 'ESTOQUE',
          model: null,
          volume: null,
          amount: 0,
          operator: null,
          description: null,
        })
        .where(eq(box.id, cleanId))
        .run();
      return { closed, stockLocation: 'ESTOQUE' as BoxLocation };
    }

    // Roteamento padrão: caixa volta ao estoque após finalizar
    tx.update(box)
      .set({ location: stockLocation, operator })
      .where(eq(box.id, cleanId))
      .run();

    return { closed, stockLocation };
  });
}

// ─── expedicao ────────────────────────────────────────────────────────────────

export function expedicao(data: ExpedicaoInput) {
  const cleanId = data.boxId.trim().toUpperCase();
  const filial = data.filialDestino.trim();

  if (!filial) throw new Error('Filial de destino é obrigatória.');

  const [currentBox] = db.select().from(box).where(eq(box.id, cleanId)).limit(1).all();
  if (!currentBox) throw new Error(`Caixa '${cleanId}' não encontrada.`);

  // Valida que não há etapa em aberto
  const [openRecord] = db
    .select()
    .from(history)
    .where(and(
      eq(history.boxId, cleanId),
      or(eq(history.stepStatus, 'OPEN'), isNull(history.endTime))
    ))
    .limit(1)
    .all();

  if (openRecord) {
    throw new Error(
      `Bloqueado: a etapa "${openRecord.step}" ainda está em andamento para "${cleanId}". ` +
      `Finalize e devolva ao estoque antes de expedir.`
    );
  }

  // Valida que está no estoque (não em produção)
  const loc = currentBox.location ?? 'ESTOQUE';
  if (!STOCK_LOCATIONS.includes(loc as BoxLocation)) {
    throw new Error(
      `Bloqueado: a caixa "${cleanId}" está em "${loc}", não no estoque. ` +
      `Devolva ao estoque antes de expedir.`
    );
  }

  const now = new Date();

  return db.transaction((tx) => {
    tx.insert(history).values({
      boxId: cleanId,
      startTime: now,
      endTime: now,
      timeSpent: 0,
      typeOperation: 'EXPEDICAO',
      stepStatus: 'CLOSED',
      step: 'Expedicao',
      location: filial,
      operator: data.operator,
      description: data.description ?? null,
    }).run();

    tx.update(box)
      .set({ location: filial, operator: data.operator })
      .where(eq(box.id, cleanId))
      .run();

    return { boxId: cleanId, filialDestino: filial };
  });
}

// ─── getBoxHistory ────────────────────────────────────────────────────────────

export function getBoxHistory(boxId: string) {
  const cleanId = boxId.trim().toUpperCase();
  return db
    .select()
    .from(history)
    .where(eq(history.boxId, cleanId))
    .orderBy(history.startTime)
    .all();
}

// ─── getRecentHistory ─────────────────────────────────────────────────────────

export function getRecentHistory(limit = 100) {
  return db
    .select()
    .from(history)
    .orderBy(desc(history.startTime))
    .limit(limit)
    .all();
}

// ─── getStockSummary ──────────────────────────────────────────────────────────

export function getStockSummary(): StockSummary {
  const allBoxes = db.select({ location: box.location, step: box.step }).from(box).all();

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
