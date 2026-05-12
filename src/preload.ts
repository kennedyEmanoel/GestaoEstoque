import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  createBox: (data: any) => ipcRenderer.invoke('create-box', data),
  getBox: (id: string) => ipcRenderer.invoke('get-box', id),
  scanBox: (data: any) => ipcRenderer.invoke('scan-box', data),
  finishStep: (boxId: string, operator: string) => ipcRenderer.invoke('finish-step', boxId, operator),
  getBoxHistory: (boxId: string) => ipcRenderer.invoke('get-box-history', boxId),
  getStockSummary: () => ipcRenderer.invoke('get-stock-summary'),
});
