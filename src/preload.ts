import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  createBox: (data: any) => ipcRenderer.invoke('create-box', data),
  getNextBatchIds: (prefix: string, count: number) => ipcRenderer.invoke('get-next-batch-ids', prefix, count),
  createBatchBoxes: (data: any) => ipcRenderer.invoke('create-batch-boxes', data),
  getBox: (id: string) => ipcRenderer.invoke('get-box', id),
  startStep: (data: any) => ipcRenderer.invoke('start-step', data),
  finishStep: (boxId: string, operator: string, stockLocation?: string) =>
    ipcRenderer.invoke('finish-step', boxId, operator, stockLocation),
  getBoxHistory: (boxId: string) => ipcRenderer.invoke('get-box-history', boxId),
  getRecentHistory: (limit?: number) => ipcRenderer.invoke('get-recent-history', limit),
  getStockSummary: () => ipcRenderer.invoke('get-stock-summary'),
  getDashboard: (filters: any) => ipcRenderer.invoke('get-dashboard', filters),
  deleteBox: (id: string) => ipcRenderer.invoke('delete-box', id),
  deleteManyBoxes: (prefix: string) => ipcRenderer.invoke('delete-many-boxes', prefix),
});
