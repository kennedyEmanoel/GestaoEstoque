import { ipcMain } from 'electron';
import { db } from '../worker/dbClient';
import type { NewBoxInput, StartStepInput, BatchBoxInput, CreateTrayFromSourcesInput } from '../../shared/types';

export const setupBoxControllers = () => {

  ipcMain.handle('create-box', async (_event, data: NewBoxInput) => {
    try { return { success: true, data: await db.createBox(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-box', async (_event, id: string) => {
    try { return { success: true, data: await db.getBoxById(id) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('start-step', async (_event, data: StartStepInput) => {
    try { return { success: true, data: await db.startStep(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('finish-step', async (_event, boxId: string, operator: string, stockLocation?: string) => {
    try { return { success: true, data: await db.finishStep(boxId, operator, stockLocation as any) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-box-history', async (_event, boxId: string) => {
    try { return { success: true, data: await db.getBoxHistory(boxId) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-next-batch-ids', async (_event, prefix: string, count: number) => {
    try { return { success: true, data: await db.getNextBatchIds(prefix as any, count) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('create-batch-boxes', async (_event, data: BatchBoxInput) => {
    try { return { success: true, data: await db.createBatchBoxes(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-recent-history', async (_event, limit?: number) => {
    try { return { success: true, data: await db.getRecentHistory(limit) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-stock-summary', async () => {
    try { return { success: true, data: await db.getStockSummary() }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('delete-box', async (_event, id: string) => {
    try { await db.deleteBox(id); return { success: true }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('expedicao', async (_event, data: any) => {
    try { return { success: true, data: await db.expedicao(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('delete-many-boxes', async (_event, prefix: string) => {
    try { return { success: true, data: await db.deleteManyBoxes(prefix as any) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('consumir-bdj', async (_event, bdjId: string, caixaDestinoId: string, operator: string) => {
    try { return { success: true, data: await db.consumirBdj(bdjId, caixaDestinoId, operator) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('create-tray-from-sources', async (_event, data: CreateTrayFromSourcesInput) => {
    try { return { success: true, data: await db.createTrayFromSources(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-box-lineage', async (_event, boxId: string) => {
    try { return { success: true, data: await db.getBoxLineage(boxId) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('finish-insumo-step', async (_event, data: any) => {
    try { return { success: true, data: await db.finishInsumoStep(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

};
