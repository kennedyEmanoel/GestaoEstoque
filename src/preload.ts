// src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Buscar todas as caixas
  getBoxes: () => ipcRenderer.invoke('db:get-all-boxes'),
  // Salvar uma nova caixa
  saveBox: (data: any) => ipcRenderer.invoke('db:create-box', data),
});