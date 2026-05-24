import { ipcMain } from 'electron';
import { getDashboard } from '../services/boxServices';
import type { DashboardFilters } from '../../shared/types';

export const setupDashboardControllers = () => {
  ipcMain.handle('get-dashboard', async (_event, filters: DashboardFilters) => {
    try { return { success: true, data: getDashboard(filters ?? {}) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });
};
