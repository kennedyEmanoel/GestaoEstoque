import { ipcMain } from 'electron';
import {
  createBox,
  createBatchBoxes,
  getNextBatchIds,
  getBoxById,
  deleteBox,
  deleteManyBoxes,
  startStep,
  finishStep,
  expedicao,
  getBoxHistory,
  getRecentHistory,
  getStockSummary,
} from '../services/boxServices';
import type { NewBoxInput, StartStepInput, BatchBoxInput } from '../../shared/types';

export const setupBoxControllers = () => {

  ipcMain.handle('create-box', (_event, data: NewBoxInput) => {
    try {
      return { success: true, data: createBox(data) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-box', (_event, id: string) => {
    try {
      return { success: true, data: getBoxById(id) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('start-step', (_event, data: StartStepInput) => {
    try {
      return { success: true, data: startStep(data) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('finish-step', (_event, boxId: string, operator: string, stockLocation?: string) => {
    try {
      return { success: true, data: finishStep(boxId, operator, stockLocation as any) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-box-history', (_event, boxId: string) => {
    try {
      return { success: true, data: getBoxHistory(boxId) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-next-batch-ids', (_event, prefix: string, count: number) => {
    try {
      return { success: true, data: getNextBatchIds(prefix as any, count) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('create-batch-boxes', (_event, data: BatchBoxInput) => {
    try {
      return { success: true, data: createBatchBoxes(data) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-recent-history', (_event, limit?: number) => {
    try {
      return { success: true, data: getRecentHistory(limit) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-stock-summary', () => {
    try {
      return { success: true, data: getStockSummary() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-box', (_event, id: string) => {
    try {
      deleteBox(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('expedicao', (_event, data: any) => {
    try {
      return { success: true, data: expedicao(data) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-many-boxes', (_event, prefix: string) => {
    try {
      const count = deleteManyBoxes(prefix as any);
      return { success: true, data: count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

};
