/**
 * Cliente assíncrono para o Worker Thread do banco de dados.
 *
 * Cada chamada retorna uma Promise que resolve quando o worker responde.
 * O Main Process fica livre para processar outras mensagens IPC enquanto
 * a query roda na thread separada.
 */
import { Worker } from 'worker_threads';
import path from 'path';

type PendingCall = { resolve: (value: unknown) => void; reject: (reason: unknown) => void };

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, PendingCall>();

export function initDbWorker(dbPath: string): void {
  if (worker) return;

  // O worker fica em app.asar.unpacked em produção (não pode ser lido de dentro do .asar)
  // Em dev fica em .vite/build/ normalmente
  const workerPath = path.join(__dirname, 'dbWorker.js').replace('app.asar', 'app.asar.unpacked');

  worker = new Worker(workerPath, { workerData: { dbPath } });

  worker.on('message', ({ id, result, error }: { id: number; result?: unknown; error?: string }) => {
    const call = pending.get(id);
    if (!call) return;
    pending.delete(id);
    if (error !== undefined) call.reject(new Error(error));
    else call.resolve(result);
  });

  worker.on('error', (err) => {
    for (const { reject } of pending.values()) reject(err);
    pending.clear();
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      const err = new Error(`DB Worker encerrou inesperadamente (código ${code})`);
      for (const { reject } of pending.values()) reject(err);
      pending.clear();
    }
    worker = null;
  });
}

function call<T>(op: string, ...args: unknown[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (!worker) {
      reject(new Error('DB Worker não inicializado. Certifique-se de chamar initDbWorker() no app.ready.'));
      return;
    }
    const id = nextId++;
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    worker.postMessage({ id, op, args });
  });
}

// ─── API tipada do cliente ────────────────────────────────────────────────────

import type {
  NewBoxInput, StartStepInput, StockSummary, BatchBoxInput, ExpedicaoInput,
  DashboardFilters, DashboardData, CreateTrayFromSourcesInput, BoxLineage,
  FinishInsumoStepInput,
} from '../../shared/types';
import type { BoxPrefix, BoxLocation } from '../models/schema/box';

export const db = {
  createBox:             (data: NewBoxInput)                                       => call<unknown>('createBox', data),
  getNextBatchIds:       (prefix: BoxPrefix, count: number)                        => call<string[]>('getNextBatchIds', prefix, count),
  createBatchBoxes:      (data: BatchBoxInput)                                     => call<unknown[]>('createBatchBoxes', data),
  getBoxById:            (id: string)                                              => call<unknown>('getBoxById', id),
  deleteBox:             (id: string)                                              => call<void>('deleteBox', id),
  deleteManyBoxes:       (prefix: BoxPrefix | 'ALL')                               => call<number>('deleteManyBoxes', prefix),
  startStep:             (data: StartStepInput)                                    => call<unknown>('startStep', data),
  finishStep:            (boxId: string, operator: string, location?: BoxLocation) => call<unknown>('finishStep', boxId, operator, location),
  expedicao:             (data: ExpedicaoInput)                                    => call<unknown>('expedicao', data),
  consumirBdj:           (bdjId: string, caixaDestinoId: string, operator: string) => call<unknown>('consumirBdj', bdjId, caixaDestinoId, operator),
  createTrayFromSources: (data: CreateTrayFromSourcesInput)                        => call<unknown>('createTrayFromSources', data),
  getBoxLineage:         (boxId: string)                                           => call<BoxLineage>('getBoxLineage', boxId),
  finishInsumoStep:      (data: FinishInsumoStepInput)                             => call<unknown>('finishInsumoStep', data),
  getBoxHistory:         (boxId: string)                                           => call<unknown[]>('getBoxHistory', boxId),
  getRecentHistory:      (limit?: number)                                          => call<unknown[]>('getRecentHistory', limit),
  getStockSummary:       ()                                                        => call<StockSummary>('getStockSummary'),
  getDashboard:          (filters: DashboardFilters)                               => call<DashboardData>('getDashboard', filters),
};
