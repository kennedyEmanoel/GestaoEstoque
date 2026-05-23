/**
 * Worker Thread do banco de dados.
 *
 * Roda em uma thread dedicada para que as queries síncronas do better-sqlite3
 * nunca bloqueiem o Event Loop do Main Process (e, por consequência, o IPC com
 * o Renderer Process).
 *
 * Comunicação: workerData (inicialização) → parentPort.on('message') / postMessage
 */
import { parentPort, workerData } from 'worker_threads';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, and, or, isNull, isNotNull, desc, like, max, inArray, gte, lte } from 'drizzle-orm';
import * as schema from '../models/schema';
import { box, STOCK_LOCATIONS } from '../models/schema/box';
import { history } from '../models/schema/history';
import { boxComposition } from '../models/schema/boxComposition';
import type { BoxPrefix, ProductionStep, BoxLocation } from '../models/schema/box';
import type {
  NewBoxInput,
  StartStepInput,
  StockSummary,
  BatchBoxInput,
  ExpedicaoInput,
  CreateTrayFromSourcesInput,
  FinishInsumoStepInput,
} from '../../shared/types';
import { calcWorkingSeconds } from '../../shared/workingTime';
import type { DashboardFilters } from '../../shared/types';

// ─── Setup do banco ──────────────────────────────────────────────────────────

const sqlite = new Database(workerData.dbPath as string);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
// cache_size negativo = kilobytes; -64000 = 64 MB de cache de página
sqlite.pragma('cache_size = -64000');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS box (
    id          TEXT PRIMARY KEY NOT NULL,
    model       TEXT,
    amount      INTEGER NOT NULL DEFAULT 500,
    step        TEXT NOT NULL,
    volume      TEXT,
    origin      TEXT DEFAULT 'PRODUCTION',
    location    TEXT DEFAULT 'ESTOQUE',
    weight      REAL NOT NULL,
    operator    TEXT,
    description TEXT,
    date        INTEGER
  );
  CREATE TABLE IF NOT EXISTS history (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    box_id         TEXT NOT NULL REFERENCES box(id),
    start_time     INTEGER NOT NULL,
    end_time       INTEGER,
    time_spent     INTEGER,
    type_operation TEXT NOT NULL,
    step_status    TEXT NOT NULL DEFAULT 'OPEN',
    step           TEXT NOT NULL,
    location       TEXT,
    lot            TEXT,
    description    TEXT,
    operator       TEXT
  );
`);

const alterColumns = [
  `ALTER TABLE history ADD COLUMN step_status TEXT NOT NULL DEFAULT 'OPEN'`,
  `ALTER TABLE box ADD COLUMN parent_id TEXT`,
  `ALTER TABLE box ADD COLUMN is_insumo INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE history ADD COLUMN modelo TEXT`,
];
for (const sql of alterColumns) {
  try { sqlite.exec(sql); } catch { /* coluna já existe */ }
}

try {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS box_composition (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      new_box_id    TEXT    NOT NULL REFERENCES box(id),
      source_box_id TEXT    NOT NULL REFERENCES box(id),
      amount_taken  INTEGER NOT NULL CHECK(amount_taken > 0),
      created_at    INTEGER NOT NULL,
      operator      TEXT,
      CONSTRAINT chk_no_self_ref CHECK(new_box_id != source_box_id)
    );
  `);
} catch { /* já existe */ }

const indexes = [
  `CREATE INDEX IF NOT EXISTS idx_history_box_id      ON history(box_id)`,
  `CREATE INDEX IF NOT EXISTS idx_history_step        ON history(step)`,
  `CREATE INDEX IF NOT EXISTS idx_history_status      ON history(step_status)`,
  `CREATE INDEX IF NOT EXISTS idx_box_step            ON box(step)`,
  `CREATE INDEX IF NOT EXISTS idx_box_location        ON box(location)`,
  `CREATE INDEX IF NOT EXISTS idx_box_model           ON box(model)`,
  `CREATE INDEX IF NOT EXISTS idx_comp_new_box        ON box_composition(new_box_id)`,
  `CREATE INDEX IF NOT EXISTS idx_comp_source_box     ON box_composition(source_box_id)`,
];
for (const sql of indexes) {
  try { sqlite.exec(sql); } catch { /* já existe */ }
}

const db = drizzle(sqlite, { schema });

// ─── Máquina de estados ──────────────────────────────────────────────────────

const ID_REGEX = /^(BDJ|NB2|4GS|LOR|NBL|INS)\d{3,}$/;

const PREFIX_TO_MODEL: Partial<Record<BoxPrefix, string>> = {
  'NB2': 'NB2',
  '4GS': '4G SIMCOM',
  'LOR': 'LORA',
  'NBL': 'NB + LORA',
};

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

function getTransitions(boxId: string): TransitionMap {
  return boxId.substring(0, 3) === '4GS' ? TRANSITIONS_4GS : DEFAULT_TRANSITIONS;
}
function getNextSteps(boxId: string, step: ProductionStep): ProductionStep[] {
  return getTransitions(boxId)[step] ?? [];
}
function isValidTransition(boxId: string, from: ProductionStep, to: ProductionStep): boolean {
  return getNextSteps(boxId, from).includes(to);
}

// ─── Handlers ────────────────────────────────────────────────────────────────

function handleCreateBox(data: NewBoxInput) {
  const cleanId = data.id.trim().toUpperCase();
  if (!ID_REGEX.test(cleanId)) throw new Error('ID inválido. Use prefixos BDJ, NB2, 4GS, LOR, NBL ou INS.');

  const prefix = cleanId.substring(0, 3) as BoxPrefix;
  const isInsumo = prefix === 'INS' ? true : (data.isInsumo ?? false);
  const isBandeja = prefix === 'BDJ';

  // INS e BDJ: modelo informado pelo operador; produtos de linha: mapeado pelo prefixo
  const model = (prefix === 'INS' || isBandeja)
    ? (data.model ?? null)
    : (PREFIX_TO_MODEL[prefix] ?? null);

  if ((prefix === 'INS' || isBandeja) && !model) throw new Error(`${prefix === 'INS' ? 'Insumo (INS)' : 'Bandeja (BDJ)'} exige um modelo de produto.`);
  if (!isBandeja && prefix !== 'INS' && !model) throw new Error(`Prefixo '${prefix}' não possui produto mapeado.`);

  const origin = isBandeja ? 'TRAY' : 'PRODUCTION';
  const initialAmount = prefix === 'INS' ? (data.amount ?? 450) : (data.amount ?? 500);
  const initialStep: ProductionStep = isInsumo ? 'Montagem' : (data.step ?? 'Montagem');

  return db.transaction((tx) => {
    try {
      const [result] = tx.insert(box).values({
        id: cleanId,
        weight: data.weight ?? 0,
        amount: initialAmount,
        model,
        operator: data.operator,
        description: data.description,
        volume: data.volume,
        origin,
        step: initialStep,
        location: data.location ?? 'ESTOQUE',
        isInsumo,
      }).returning().all();

      tx.insert(history).values({
        boxId: cleanId,
        startTime: new Date(),
        endTime: new Date(),
        timeSpent: 0,
        typeOperation: 'CRIACAO',
        stepStatus: 'CLOSED',
        step: initialStep,
        location: data.location ?? 'ESTOQUE',
        operator: data.operator,
        description: prefix === 'INS'
          ? `Criação — Insumo (${initialAmount} un.)`
          : isInsumo
            ? 'Criação — Insumo'
            : `Criação${isBandeja ? ' — Bandeja' : ''}`,
        modelo: model,
      }).run();

      return result;
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) throw new Error(`O código ${cleanId} já existe.`);
      throw new Error(`Erro ao criar caixa: ${error.message}`);
    }
  });
}

function handleGetNextBatchIds(prefix: BoxPrefix, count: number): string[] {
  const [row] = db.select({ maxId: max(box.id) }).from(box).where(like(box.id, `${prefix}%`)).all();
  let next = 1;
  if (row?.maxId) {
    const num = parseInt(row.maxId.substring(3), 10);
    if (!isNaN(num)) next = num + 1;
  }
  return Array.from({ length: count }, (_, i) => `${prefix}${String(next + i).padStart(4, '0')}`);
}

function handleCreateBatchBoxes(data: BatchBoxInput) {
  return db.transaction((tx) => {
    const results = [];
    for (const id of data.ids) {
      const cleanId = id.trim().toUpperCase();
      if (!ID_REGEX.test(cleanId)) throw new Error(`ID inválido: ${cleanId}`);
      const prefix = cleanId.substring(0, 3) as BoxPrefix;
      const isBandeja = prefix === 'BDJ';
      const model = isBandeja ? (data.model ?? null) : (PREFIX_TO_MODEL[prefix] ?? null);
      if (isBandeja && !model) throw new Error(`Bandeja '${cleanId}' exige um modelo.`);
      if (!isBandeja && !model) throw new Error(`Prefixo '${prefix}' sem produto mapeado.`);

      const isInsumo = data.isInsumo ?? false;
      const step: ProductionStep = isInsumo ? 'Montagem' : (data.step ?? 'Montagem');

      try {
        const [row] = tx.insert(box).values({
          id: cleanId,
          weight: data.weight ?? 0,
          amount: data.amount ?? 500,
          model,
          operator: data.operator,
          description: data.description,
          volume: data.volume ?? null,
          origin: isBandeja ? 'TRAY' : 'PRODUCTION',
          step,
          location: data.location ?? 'ESTOQUE',
          isInsumo,
        }).returning().all();

        tx.insert(history).values({
          boxId: cleanId,
          startTime: new Date(),
          endTime: new Date(),
          timeSpent: 0,
          typeOperation: 'CRIACAO',
          stepStatus: 'CLOSED',
          step,
          location: data.location ?? 'ESTOQUE',
          operator: data.operator,
          description: isInsumo ? 'Criação — Insumo' : `Criação${isBandeja ? ' — Bandeja' : ''}`,
          modelo: model,
        }).run();

        results.push(row);
      } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) throw new Error(`O código ${cleanId} já existe.`);
        throw new Error(`Erro ao criar caixa ${cleanId}: ${error.message}`);
      }
    }
    return results;
  });
}

function handleGetBoxById(id: string) {
  const cleanId = id.trim().toUpperCase();
  const [result] = db.select().from(box).where(eq(box.id, cleanId)).limit(1).all();
  if (!result) throw new Error(`Código '${cleanId}' não encontrado.`);
  return result;
}

function handleDeleteBox(id: string) {
  const cleanId = id.trim().toUpperCase();
  return db.transaction((tx) => {
    tx.delete(history).where(eq(history.boxId, cleanId)).run();
    const result = tx.delete(box).where(eq(box.id, cleanId)).run();
    if (result.changes === 0) throw new Error(`Caixa '${cleanId}' não encontrada.`);
  });
}

function handleDeleteManyBoxes(prefix: BoxPrefix | 'ALL') {
  return db.transaction((tx) => {
    if (prefix === 'ALL') {
      tx.delete(history).run();
      return tx.delete(box).run().changes;
    }
    const targets = tx.select({ id: box.id }).from(box).where(like(box.id, `${prefix}%`)).all().map(r => r.id);
    if (targets.length === 0) return 0;
    for (const id of targets) tx.delete(history).where(eq(history.boxId, id)).run();
    return tx.delete(box).where(like(box.id, `${prefix}%`)).run().changes;
  });
}

function handleStartStep(data: StartStepInput) {
  const cleanId = data.boxId.trim().toUpperCase();
  const [currentBox] = db.select().from(box).where(eq(box.id, cleanId)).limit(1).all();
  if (!currentBox) throw new Error(`Caixa '${cleanId}' não encontrada.`);

  const currentStep = currentBox.step as ProductionStep;
  if (currentStep === 'Concluida') throw new Error(`A caixa '${cleanId}' já está concluída.`);

  const [openRecord] = db.select().from(history)
    .where(and(eq(history.boxId, cleanId), or(eq(history.stepStatus, 'OPEN'), isNull(history.endTime))))
    .limit(1).all();
  if (openRecord) throw new Error(`Bloqueado: a etapa "${openRecord.step}" ainda está em andamento. Finalize antes de iniciar "${data.step}".`);

  if (currentBox.isInsumo && data.step !== 'Montagem') {
    const montagemConcluida = db.select().from(history)
      .where(and(eq(history.boxId, cleanId), eq(history.step, 'Montagem'), eq(history.stepStatus, 'CLOSED'), eq(history.typeOperation, 'SCAN_END')))
      .limit(1).all();
    if (montagemConcluida.length === 0) throw new Error(`Insumo "${cleanId}" ainda não passou pela Montagem.`);
  }

  const isInsumoStartingMontagem = currentBox.isInsumo && data.step === 'Montagem' && currentStep === 'Montagem';
  if (!isInsumoStartingMontagem && !isValidTransition(cleanId, currentStep, data.step)) {
    const next = getNextSteps(cleanId, currentStep);
    throw new Error(`Transição inválida: "${currentStep}" → "${data.step}". Próximas: ${next.join(' ou ') || 'nenhuma'}.`);
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

    tx.update(box).set({ step: data.step, location: data.location, operator: data.operator }).where(eq(box.id, cleanId)).run();
    return { box: { ...currentBox, step: data.step, location: data.location, operator: data.operator }, historyRecord: newRecord };
  });
}

function handleFinishStep(boxId: string, operator: string, stockLocation: BoxLocation = 'ESTOQUE') {
  const cleanId = boxId.trim().toUpperCase();
  const now = new Date();

  const [openRecord] = db.select().from(history)
    .where(and(eq(history.boxId, cleanId), or(eq(history.stepStatus, 'OPEN'), isNull(history.endTime))))
    .limit(1).all();
  if (!openRecord) throw new Error(`Nenhuma etapa em andamento para "${cleanId}".`);

  const startMs = openRecord.startTime instanceof Date ? openRecord.startTime.getTime() : (openRecord.startTime as number) * 1000;
  const timeSpent = calcWorkingSeconds(startMs, now.getTime());

  return db.transaction((tx) => {
    const [closed] = tx.update(history)
      .set({ endTime: now, timeSpent, stepStatus: 'CLOSED', typeOperation: 'SCAN_END', operator })
      .where(eq(history.id, openRecord.id))
      .returning().all();
    tx.update(box).set({ location: stockLocation, operator }).where(eq(box.id, cleanId)).run();
    return { closed, stockLocation };
  });
}

function handleFinishInsumoStep(data: FinishInsumoStepInput) {
  const cleanId  = data.boxId.trim().toUpperCase();
  const cleanDst = data.destinationId.trim().toUpperCase();

  if (!cleanId.startsWith('INS'))
    throw new Error(`"${cleanId}" não é uma caixa de Insumo (prefixo INS).`);
  if (cleanId === cleanDst)
    throw new Error('A caixa de origem e destino não podem ser a mesma.');
  if (!data.producedAmount || data.producedAmount <= 0)
    throw new Error('A quantidade produzida deve ser maior que zero.');

  // ── Leituras fora da transação ───────────────────────────────────────────
  const [srcBox] = db.select().from(box).where(eq(box.id, cleanId)).limit(1).all();
  if (!srcBox) throw new Error(`Caixa de insumo "${cleanId}" não encontrada.`);
  if (srcBox.step === 'Consumida') throw new Error(`Insumo "${cleanId}" já foi totalmente consumido.`);

  const [openRecord] = db.select().from(history)
    .where(and(eq(history.boxId, cleanId), or(eq(history.stepStatus, 'OPEN'), isNull(history.endTime))))
    .limit(1).all();
  if (!openRecord) throw new Error(`Nenhuma etapa em andamento para "${cleanId}". Inicie uma etapa antes de finalizar.`);

  const availableAmount = srcBox.amount ?? 0;
  if (data.producedAmount > availableAmount)
    throw new Error(`Quantidade insuficiente em "${cleanId}": solicitado ${data.producedAmount}, disponível ${availableAmount}.`);

  const [existingDst] = db.select().from(box).where(eq(box.id, cleanDst)).limit(1).all();

  // Destino novo BDJ exige modelo
  const dstPrefix = cleanDst.substring(0, 3);
  if (!existingDst && dstPrefix === 'BDJ' && !data.destinationModel)
    throw new Error(`Nova bandeja "${cleanDst}" exige um modelo de produto (destinationModel).`);

  const now = new Date();
  const startMs = openRecord.startTime instanceof Date
    ? openRecord.startTime.getTime()
    : (openRecord.startTime as number) * 1000;
  const timeSpent = calcWorkingSeconds(startMs, now.getTime());

  const novoAmountSrc = availableAmount - data.producedAmount;
  const srcEsgotada   = novoAmountSrc === 0;

  return db.transaction((tx) => {
    // A) Fechar registro de tempo da caixa INS
    tx.update(history)
      .set({ endTime: now, timeSpent, stepStatus: 'CLOSED', typeOperation: 'SCAN_END', operator: data.operator })
      .where(eq(history.id, openRecord.id))
      .run();

    // B) Subtrair amount da caixa INS; marcar Consumida se zerou
    tx.update(box)
      .set({
        amount:   novoAmountSrc,
        step:     srcEsgotada ? 'Consumida' : srcBox.step,
        location: data.stockLocation,
        operator: data.operator,
      })
      .where(eq(box.id, cleanId))
      .run();

    // Histórico de saída na caixa INS
    tx.insert(history).values({
      boxId:         cleanId,
      startTime:     now,
      endTime:       now,
      timeSpent:     0,
      typeOperation: 'INSUMO_SAIDA',
      stepStatus:    'CLOSED',
      step:          srcEsgotada ? 'Consumida' : (srcBox.step as string),
      location:      data.stockLocation,
      operator:      data.operator,
      description:   `${data.producedAmount} un. enviadas para ${cleanDst}. Saldo restante: ${novoAmountSrc} un.${srcEsgotada ? ' — ESGOTADO' : ''}`,
      modelo:        srcBox.model,
    }).run();

    // C) Criar ou atualizar caixa de destino
    if (existingDst) {
      // Destino já existe — acumula amount
      tx.update(box)
        .set({ amount: (existingDst.amount ?? 0) + data.producedAmount, operator: data.operator })
        .where(eq(box.id, cleanDst))
        .run();
    } else {
      // Destino não existe — cria
      const dstModel = dstPrefix === 'BDJ'
        ? (data.destinationModel ?? null)
        : (PREFIX_TO_MODEL[dstPrefix as BoxPrefix] ?? null);
      const dstStep: ProductionStep = data.destinationStep ?? 'Montagem';

      tx.insert(box).values({
        id:          cleanDst,
        model:       dstModel,
        amount:      data.producedAmount,
        step:        dstStep,
        origin:      dstPrefix === 'BDJ' ? 'TRAY' : 'PRODUCTION',
        location:    'ESTOQUE',
        weight:      0,
        operator:    data.operator,
        description: data.description ?? null,
        isInsumo:    false,
      }).run();

      // Histórico de criação do destino
      tx.insert(history).values({
        boxId:         cleanDst,
        startTime:     now,
        endTime:       now,
        timeSpent:     0,
        typeOperation: 'CRIACAO',
        stepStatus:    'CLOSED',
        step:          dstStep,
        location:      'ESTOQUE',
        operator:      data.operator,
        description:   `Criado a partir do insumo ${cleanId}`,
        modelo:        dstModel,
      }).run();
    }

    // Histórico de entrada no destino
    tx.insert(history).values({
      boxId:         cleanDst,
      startTime:     now,
      endTime:       now,
      timeSpent:     0,
      typeOperation: 'INSUMO_ENTRADA',
      stepStatus:    'CLOSED',
      step:          existingDst ? (existingDst.step as string) : (data.destinationStep ?? 'Montagem'),
      location:      'ESTOQUE',
      operator:      data.operator,
      description:   `+${data.producedAmount} un. recebidas do insumo ${cleanId}`,
      modelo:        existingDst ? existingDst.model : (data.destinationModel ?? null),
    }).run();

    // D) Rastreabilidade
    tx.insert(boxComposition).values({
      newBoxId:    cleanDst,
      sourceBoxId: cleanId,
      amountTaken: data.producedAmount,
      createdAt:   now,
      operator:    data.operator,
    }).run();

    return {
      source: { id: cleanId, novoAmount: novoAmountSrc, esgotada: srcEsgotada },
      destination: {
        id: cleanDst,
        created: !existingDst,
        amount: existingDst ? (existingDst.amount ?? 0) + data.producedAmount : data.producedAmount,
      },
    };
  });
}

function handleExpedicao(data: ExpedicaoInput) {
  const cleanId = data.boxId.trim().toUpperCase();
  const filial = data.filialDestino.trim();
  if (!filial) throw new Error('Filial de destino é obrigatória.');

  const [currentBox] = db.select().from(box).where(eq(box.id, cleanId)).limit(1).all();
  if (!currentBox) throw new Error(`Caixa '${cleanId}' não encontrada.`);

  const [openRecord] = db.select().from(history)
    .where(and(eq(history.boxId, cleanId), or(eq(history.stepStatus, 'OPEN'), isNull(history.endTime))))
    .limit(1).all();
  if (openRecord) throw new Error(`Etapa "${openRecord.step}" ainda em andamento. Finalize antes de expedir.`);

  const loc = currentBox.location ?? 'ESTOQUE';
  if (!STOCK_LOCATIONS.includes(loc as BoxLocation)) throw new Error(`Caixa "${cleanId}" está em "${loc}", não no estoque.`);

  const now = new Date();
  return db.transaction((tx) => {
    tx.insert(history).values({
      boxId: cleanId, startTime: now, endTime: now, timeSpent: 0,
      typeOperation: 'EXPEDICAO', stepStatus: 'CLOSED', step: 'Expedicao',
      location: filial, operator: data.operator, description: data.description ?? null,
    }).run();
    tx.update(box).set({ location: filial, operator: data.operator }).where(eq(box.id, cleanId)).run();
    return { boxId: cleanId, filialDestino: filial };
  });
}

function handleConsumirBdj(bdjId: string, caixaDestinoId: string, operator: string) {
  const cleanBdj  = bdjId.trim().toUpperCase();
  const cleanDest = caixaDestinoId.trim().toUpperCase();
  if (!cleanBdj.startsWith('BDJ')) throw new Error(`"${cleanBdj}" não é uma Bandeja (prefixo BDJ).`);

  const [bdj]  = db.select().from(box).where(eq(box.id, cleanBdj)).limit(1).all();
  if (!bdj) throw new Error(`Bandeja "${cleanBdj}" não encontrada.`);
  if (bdj.step === 'Consumida') throw new Error(`Bandeja "${cleanBdj}" já foi consumida.`);

  const [dest] = db.select().from(box).where(eq(box.id, cleanDest)).limit(1).all();
  if (!dest) throw new Error(`Caixa destino "${cleanDest}" não encontrada.`);
  if (dest.step !== 'Soldagem') throw new Error(`Caixa "${cleanDest}" não está na Soldagem.`);
  if (bdj.model && dest.model && bdj.model !== dest.model) throw new Error(`Modelos incompatíveis: BDJ="${bdj.model}", destino="${dest.model}".`);

  const [openDest] = db.select().from(history)
    .where(and(eq(history.boxId, cleanDest), or(eq(history.stepStatus, 'OPEN'), isNull(history.endTime))))
    .limit(1).all();
  if (!openDest) throw new Error(`"${cleanDest}" não tem Soldagem em andamento.`);

  const now = new Date();
  return db.transaction((tx) => {
    tx.update(box).set({ step: 'Consumida', parentId: cleanDest, operator }).where(eq(box.id, cleanBdj)).run();
    tx.insert(history).values({
      boxId: cleanBdj, startTime: now, endTime: now, timeSpent: 0,
      typeOperation: 'CONSUMO_BDJ', stepStatus: 'CLOSED', step: 'Consumida',
      location: cleanDest, operator, description: `Consumida pela caixa ${cleanDest}`,
    }).run();
    const novoAmount = (dest.amount ?? 0) + (bdj.amount ?? 0);
    tx.update(box).set({ amount: novoAmount }).where(eq(box.id, cleanDest)).run();
    return { bdj: { id: cleanBdj, amountConsumed: bdj.amount ?? 0 }, destino: { id: cleanDest, novoAmount } };
  });
}

// ─── createTrayFromSources (Split / Merge) ────────────────────────────────────

function handleCreateTrayFromSources(data: CreateTrayFromSourcesInput) {
  const cleanNewId = data.newBoxId.trim().toUpperCase();

  if (!ID_REGEX.test(cleanNewId))
    throw new Error('ID inválido para a nova bandeja. Use prefixos BDJ, NB2, 4GS, LOR ou NBL.');

  const prefix = cleanNewId.substring(0, 3) as BoxPrefix;
  const isBandeja = prefix === 'BDJ';
  const model = isBandeja ? (data.model ?? null) : (PREFIX_TO_MODEL[prefix] ?? null);

  if (isBandeja && !model) throw new Error('Bandeja (BDJ) exige um modelo de produto.');
  if (!isBandeja && !model) throw new Error(`Prefixo '${prefix}' não possui produto mapeado.`);
  if (!data.sources || data.sources.length === 0) throw new Error('É necessário ao menos uma fonte (sources).');

  // ── Fase 1: validações fora da transação (leituras puras) ────────────────
  const sourcesValidated: Array<{
    sourceBox: typeof box.$inferSelect;
    amountTaken: number;
  }> = [];

  for (const s of data.sources) {
    if (!s.sourceBoxId || !s.amountTaken) throw new Error('Cada fonte precisa de sourceBoxId e amountTaken.');

    const cleanSrcId = s.sourceBoxId.trim().toUpperCase();

    if (cleanSrcId === cleanNewId)
      throw new Error(`Fonte "${cleanSrcId}" não pode ser a mesma caixa que está sendo criada.`);

    if (s.amountTaken <= 0)
      throw new Error(`amountTaken para "${cleanSrcId}" deve ser maior que zero.`);

    const [sourceBox] = db.select().from(box).where(eq(box.id, cleanSrcId)).limit(1).all();
    if (!sourceBox) throw new Error(`Caixa fonte "${cleanSrcId}" não encontrada.`);
    if (sourceBox.step === 'Consumida') throw new Error(`Caixa fonte "${cleanSrcId}" já foi totalmente consumida.`);

    const availableAmount = sourceBox.amount ?? 0;
    if (s.amountTaken > availableAmount)
      throw new Error(
        `Quantidade insuficiente em "${cleanSrcId}": solicitado ${s.amountTaken}, disponível ${availableAmount}.`
      );

    if (model && sourceBox.model && sourceBox.model !== model)
      throw new Error(
        `Modelo incompatível: fonte "${cleanSrcId}" é "${sourceBox.model}", mas a nova caixa é "${model}".`
      );

    sourcesValidated.push({ sourceBox, amountTaken: s.amountTaken });
  }

  const totalAmount = sourcesValidated.reduce((sum, s) => sum + s.amountTaken, 0);
  const now = new Date();

  // ── Fase 2: transação atômica ────────────────────────────────────────────
  return db.transaction((tx) => {
    // A) Criar a nova Box
    const [newBox] = tx.insert(box).values({
      id:       cleanNewId,
      model,
      amount:   totalAmount,
      step:     'Montagem',
      origin:   isBandeja ? 'TRAY' : 'PRODUCTION',
      location: data.location ?? 'ESTOQUE',
      weight:   data.weight ?? 0,
      operator: data.operator,
      description: data.description ?? null,
      isInsumo: false,
    }).returning().all();

    // Histórico de criação da nova Box
    tx.insert(history).values({
      boxId:         cleanNewId,
      startTime:     now,
      endTime:       now,
      timeSpent:     0,
      typeOperation: 'CRIACAO_SPLIT',
      stepStatus:    'CLOSED',
      step:          'Montagem',
      location:      data.location ?? 'ESTOQUE',
      operator:      data.operator,
      description:   `Criado por composição de ${sourcesValidated.length} fonte(s). Total: ${totalAmount} un.`,
      modelo:        model,
    }).run();

    // B) Para cada fonte: subtrair amount, atualizar step se necessário, registrar histórico e composição
    const sourcesResult = sourcesValidated.map(({ sourceBox, amountTaken }) => {
      const novoAmount = (sourceBox.amount ?? 0) - amountTaken;
      const esgotada   = novoAmount === 0;
      const novoStep   = esgotada ? 'Consumida' : (sourceBox.step as ProductionStep);

      tx.update(box)
        .set({ amount: novoAmount, step: novoStep, operator: data.operator })
        .where(eq(box.id, sourceBox.id))
        .run();

      tx.insert(history).values({
        boxId:         sourceBox.id,
        startTime:     now,
        endTime:       now,
        timeSpent:     0,
        typeOperation: esgotada ? 'CONSUMO_SPLIT' : 'SPLIT_PARCIAL',
        stepStatus:    'CLOSED',
        step:          novoStep,
        location:      sourceBox.location ?? 'ESTOQUE',
        operator:      data.operator,
        description:   `${amountTaken} un. transferidas para ${cleanNewId}. Saldo restante: ${novoAmount} un.`,
        modelo:        sourceBox.model,
      }).run();

      // C) Registro de rastreabilidade
      tx.insert(boxComposition).values({
        newBoxId:    cleanNewId,
        sourceBoxId: sourceBox.id,
        amountTaken,
        createdAt:   now,
        operator:    data.operator,
      }).run();

      return {
        sourceBoxId:  sourceBox.id,
        amountTaken,
        saldoRestante: novoAmount,
        esgotada,
      };
    });

    return { newBox, totalAmount, sources: sourcesResult };
  });
}

// ─── getBoxLineage ─────────────────────────────────────────────────────────────

function handleGetBoxLineage(boxId: string) {
  const cleanId = boxId.trim().toUpperCase();

  // Ascendentes: de quais caixas este cleanId foi formado
  const ascendentes = db
    .select({
      compositionId: boxComposition.id,
      sourceBoxId:   boxComposition.sourceBoxId,
      amountTaken:   boxComposition.amountTaken,
      createdAt:     boxComposition.createdAt,
      operator:      boxComposition.operator,
      sourceModel:   box.model,
      sourceStep:    box.step,
      sourceAmount:  box.amount,
    })
    .from(boxComposition)
    .leftJoin(box, eq(box.id, boxComposition.sourceBoxId))
    .where(eq(boxComposition.newBoxId, cleanId))
    .all();

  // Descendentes: para quais caixas este cleanId contribuiu
  const descendentes = db
    .select({
      compositionId: boxComposition.id,
      newBoxId:      boxComposition.newBoxId,
      amountTaken:   boxComposition.amountTaken,
      createdAt:     boxComposition.createdAt,
      operator:      boxComposition.operator,
      destModel:     box.model,
      destStep:      box.step,
      destAmount:    box.amount,
    })
    .from(boxComposition)
    .leftJoin(box, eq(box.id, boxComposition.newBoxId))
    .where(eq(boxComposition.sourceBoxId, cleanId))
    .all();

  return { boxId: cleanId, ascendentes, descendentes };
}

function handleGetBoxHistory(boxId: string) {
  return db.select().from(history).where(eq(history.boxId, boxId.trim().toUpperCase())).orderBy(history.startTime).all();
}

function handleGetRecentHistory(limit = 100) {
  return db.select().from(history).orderBy(desc(history.startTime)).limit(limit).all();
}

function handleGetStockSummary(): StockSummary {
  const allBoxes = db.select({ location: box.location, step: box.step }).from(box).all();
  const byLocation: Record<string, number> = {};
  const byStep: Partial<Record<ProductionStep, number>> = {};
  let inStock = 0, inProduction = 0;
  for (const b of allBoxes) {
    const loc = b.location ?? 'ESTOQUE';
    byLocation[loc] = (byLocation[loc] ?? 0) + 1;
    const step = b.step as ProductionStep;
    byStep[step] = (byStep[step] ?? 0) + 1;
    if (STOCK_LOCATIONS.includes(loc as BoxLocation)) inStock++; else inProduction++;
  }
  return { inStock, inProduction, byLocation, byStep };
}

const PRODUCTION_STEPS: ProductionStep[] = ['Montagem', 'Soldagem', 'Revisao', 'Firmware', 'IMEI', 'Concluida'];

function handleGetDashboard(filters: DashboardFilters) {
  const conditions = [];
  if (filters.model)    conditions.push(eq(box.model, filters.model));
  if (filters.dateFrom) conditions.push(gte(box.date, new Date(filters.dateFrom)));
  if (filters.dateTo)   conditions.push(lte(box.date, new Date(filters.dateTo)));

  const filtered = conditions.length > 0
    ? db.select().from(box).where(and(...conditions)).all()
    : db.select().from(box).all();

  const boxIds = filtered.map(b => b.id);

  let totalUnitsInStock = 0, totalUnitsInProduction = 0;
  const modelMap: Record<string, { inStock: number; inProduction: number }> = {};

  for (const b of filtered) {
    const loc = (b.location ?? 'ESTOQUE') as BoxLocation;
    const isStock = STOCK_LOCATIONS.includes(loc);
    const units = b.amount ?? 0;
    const model = b.model ?? 'Sem modelo';
    if (!modelMap[model]) modelMap[model] = { inStock: 0, inProduction: 0 };
    if (isStock) { totalUnitsInStock += units; modelMap[model].inStock += units; }
    else         { totalUnitsInProduction += units; modelMap[model].inProduction += units; }
  }

  const closedHistory = boxIds.length > 0
    ? db.select().from(history).where(and(inArray(history.boxId, boxIds), isNotNull(history.endTime))).all()
    : [];

  const stepAvgMap: Record<string, { totalSec: number; count: number }> = {};
  for (const h of closedHistory) {
    const startMs = h.startTime instanceof Date ? h.startTime.getTime() : (h.startTime as number) * 1000;
    const endMs   = h.endTime instanceof Date   ? h.endTime.getTime()   : (h.endTime as unknown as number) * 1000;
    const worked = calcWorkingSeconds(startMs, endMs);
    if (!stepAvgMap[h.step]) stepAvgMap[h.step] = { totalSec: 0, count: 0 };
    stepAvgMap[h.step].totalSec += worked;
    stepAvgMap[h.step].count   += 1;
  }

  const funnel = PRODUCTION_STEPS.map(step => {
    const inStep   = filtered.filter(b => b.step === step);
    const inStock  = inStep.filter(b => STOCK_LOCATIONS.includes((b.location ?? 'ESTOQUE') as BoxLocation)).length;
    const avg      = stepAvgMap[step];
    return {
      step,
      totalUnits:    inStep.reduce((s, b) => s + (b.amount ?? 0), 0),
      boxesInStock:  inStock,
      boxesActive:   inStep.length - inStock,
      avgLeadTimeSec: avg && avg.count > 0 ? Math.round(avg.totalSec / avg.count) : 0,
    };
  });

  const concludedBoxIds = filtered.filter(b => b.step === 'Concluida').map(b => b.id);
  let avgLeadTimeSec = 0;
  if (concludedBoxIds.length > 0) {
    const concludedHistory = db.select().from(history).where(inArray(history.boxId, concludedBoxIds)).all();
    const perBox: Record<string, { first: number; last: number }> = {};
    for (const h of concludedHistory) {
      const ts = h.startTime instanceof Date ? h.startTime.getTime() : (h.startTime as number) * 1000;
      if (!perBox[h.boxId]) perBox[h.boxId] = { first: ts, last: ts };
      if (ts < perBox[h.boxId].first) perBox[h.boxId].first = ts;
      if (ts > perBox[h.boxId].last)  perBox[h.boxId].last  = ts;
    }
    const leadTimes = Object.values(perBox).map(({ first, last }) => calcWorkingSeconds(first, last));
    if (leadTimes.length > 0) avgLeadTimeSec = Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length);
  }

  const now = Date.now();
  const windowStart = now - 7 * 24 * 3600 * 1000;
  const recentClosed = (boxIds.length > 0
    ? db.select().from(history).where(and(isNotNull(history.endTime), inArray(history.boxId, boxIds))).all()
    : db.select().from(history).where(isNotNull(history.endTime)).all()
  ).filter(h => {
    const endMs = h.endTime instanceof Date ? h.endTime.getTime() : (h.endTime as unknown as number) * 1000;
    return endMs >= windowStart && endMs <= now;
  });

  const recentBoxIds = [...new Set(recentClosed.map(h => h.boxId))];
  const unitsInWindow = filtered.filter(b => recentBoxIds.includes(b.id)).reduce((s, b) => s + (b.amount ?? 0), 0);
  const workedHours = calcWorkingSeconds(now - 8 * 7 * 3600 * 1000, now) / 3600;
  const uphLast8h = workedHours > 0 ? Math.round(unitsInWindow / workedHours) : 0;

  let bottleneckStep: ProductionStep | null = null;
  let maxAvg = 0;
  for (const f of funnel) {
    if (f.step !== 'Concluida' && f.avgLeadTimeSec > maxAvg) { maxAvg = f.avgLeadTimeSec; bottleneckStep = f.step; }
  }

  return {
    totalUnitsInStock,
    totalUnitsInProduction,
    byModel: Object.entries(modelMap).map(([model, v]) => ({ model, unitsInStock: v.inStock, unitsInProduction: v.inProduction })),
    funnel,
    avgLeadTimeSec,
    uphLast8h,
    bottleneckStep,
    availableModels: [...new Set(filtered.map(b => b.model).filter(Boolean) as string[])].sort(),
  };
}

// ─── Loop de mensagens ───────────────────────────────────────────────────────

type WorkerMessage = { id: number; op: string; args: unknown[] };

parentPort!.on('message', (msg: WorkerMessage) => {
  const { id, op, args } = msg;
  try {
    let result: unknown;
    switch (op) {
      case 'createBox':         result = handleCreateBox(args[0] as NewBoxInput); break;
      case 'getNextBatchIds':   result = handleGetNextBatchIds(args[0] as BoxPrefix, args[1] as number); break;
      case 'createBatchBoxes':  result = handleCreateBatchBoxes(args[0] as BatchBoxInput); break;
      case 'getBoxById':        result = handleGetBoxById(args[0] as string); break;
      case 'deleteBox':         result = handleDeleteBox(args[0] as string); break;
      case 'deleteManyBoxes':   result = handleDeleteManyBoxes(args[0] as BoxPrefix | 'ALL'); break;
      case 'startStep':         result = handleStartStep(args[0] as StartStepInput); break;
      case 'finishStep':        result = handleFinishStep(args[0] as string, args[1] as string, args[2] as BoxLocation); break;
      case 'finishInsumoStep':  result = handleFinishInsumoStep(args[0] as FinishInsumoStepInput); break;
      case 'expedicao':         result = handleExpedicao(args[0] as ExpedicaoInput); break;
      case 'consumirBdj':            result = handleConsumirBdj(args[0] as string, args[1] as string, args[2] as string); break;
      case 'createTrayFromSources':  result = handleCreateTrayFromSources(args[0] as CreateTrayFromSourcesInput); break;
      case 'getBoxLineage':          result = handleGetBoxLineage(args[0] as string); break;
      case 'getBoxHistory':          result = handleGetBoxHistory(args[0] as string); break;
      case 'getRecentHistory':  result = handleGetRecentHistory(args[0] as number | undefined); break;
      case 'getStockSummary':   result = handleGetStockSummary(); break;
      case 'getDashboard':      result = handleGetDashboard(args[0] as DashboardFilters); break;
      default: throw new Error(`Operação desconhecida: ${op}`);
    }
    parentPort!.postMessage({ id, result });
  } catch (err: any) {
    parentPort!.postMessage({ id, error: err.message ?? String(err) });
  }
});
