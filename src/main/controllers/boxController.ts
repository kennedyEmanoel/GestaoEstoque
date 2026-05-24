import { ipcMain } from 'electron';
import {
  createBox, getNextBatchIds, createBatchBoxes, getBoxById,
  deleteBox, deleteManyBoxes, startStep, finishStep, finishInsumoStep,
  expedicao, consumirBdj, createTrayFromSources, getBoxLineage,
  getBoxHistory, getRecentHistory, getStockSummary,
} from '../services/boxServices';
import type { NewBoxInput, StartStepInput, BatchBoxInput, CreateTrayFromSourcesInput } from '../../shared/types';

export const setupBoxControllers = () => {

  ipcMain.handle('create-box', async (_event, data: NewBoxInput) => {
    try { return { success: true, data: createBox(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-box', async (_event, id: string) => {
    try { return { success: true, data: getBoxById(id) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('start-step', async (_event, data: StartStepInput) => {
    try { return { success: true, data: startStep(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('finish-step', async (_event, boxId: string, operator: string, stockLocation?: string) => {
    try { return { success: true, data: finishStep(boxId, operator, stockLocation as any) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-box-history', async (_event, boxId: string) => {
    try { return { success: true, data: getBoxHistory(boxId) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-next-batch-ids', async (_event, prefix: string, count: number) => {
    try { return { success: true, data: getNextBatchIds(prefix as any, count) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('create-batch-boxes', async (_event, data: BatchBoxInput) => {
    try { return { success: true, data: createBatchBoxes(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-recent-history', async (_event, limit?: number) => {
    try { return { success: true, data: getRecentHistory(limit) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-stock-summary', async () => {
    try { return { success: true, data: getStockSummary() }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('delete-box', async (_event, id: string) => {
    try { deleteBox(id); return { success: true }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('expedicao', async (_event, data: any) => {
    try { return { success: true, data: expedicao(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('delete-many-boxes', async (_event, prefix: string) => {
    try { return { success: true, data: deleteManyBoxes(prefix as any) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('consumir-bdj', async (_event, bdjId: string, caixaDestinoId: string, operator: string) => {
    try { return { success: true, data: consumirBdj(bdjId, caixaDestinoId, operator) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('create-tray-from-sources', async (_event, data: CreateTrayFromSourcesInput) => {
    try { return { success: true, data: createTrayFromSources(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-box-lineage', async (_event, boxId: string) => {
    try { return { success: true, data: getBoxLineage(boxId) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('finish-insumo-step', async (_event, data: any) => {
    try { return { success: true, data: finishInsumoStep(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

};
