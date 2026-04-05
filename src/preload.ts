// src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  createBox: (data: any) => ipcRenderer.invoke('create-box', data),
  // Buscar todas as caixas
  getBox: (id: string) => ipcRenderer.invoke('get-box', id),
  // Salvar uma nova caixa
  saveBox: (data: any) => ipcRenderer.invoke('db:create-box', data),
});