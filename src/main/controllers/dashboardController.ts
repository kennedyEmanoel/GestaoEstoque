import { ipcMain } from 'electron';
import { getDashboardData } from '../services/dashboardService';
import type { DashboardFilters } from '../services/dashboardService';

export const setupDashboardControllers = () => {
  ipcMain.handle('get-dashboard', async (_event, filters: DashboardFilters) => {
    try {
      const data = getDashboardData(filters ?? {});
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
};
