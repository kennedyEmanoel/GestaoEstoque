import { ipcMain } from 'electron';
import {
  createBox,
  getBoxById,
  scanBox,
  finishStep,
  getBoxHistory,
  getStockSummary,
} from '../services/boxServices';
import type { NewBoxInput, ScanInput } from '../../shared/types';

export const setupBoxControllers = () => {

  ipcMain.handle('create-box', async (_event, data: NewBoxInput) => {
    try {
      const newBox = await createBox(data);
      return { success: true, data: newBox };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-box', async (_event, id: string) => {
    try {
      const found = await getBoxById(id);
      return { success: true, data: found };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scan-box', async (_event, data: ScanInput) => {
    try {
      const result = await scanBox(data);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('finish-step', async (_event, boxId: string, operator: string) => {
    try {
      const result = await finishStep(boxId, operator);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-box-history', async (_event, boxId: string) => {
    try {
      const logs = await getBoxHistory(boxId);
      return { success: true, data: logs };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-stock-summary', async () => {
    try {
      const summary = await getStockSummary();
      return { success: true, data: summary };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

};
