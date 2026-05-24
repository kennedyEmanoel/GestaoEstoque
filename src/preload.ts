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
  expedicao: (data: any) => ipcRenderer.invoke('expedicao', data),
  deleteBox: (id: string) => ipcRenderer.invoke('delete-box', id),
  deleteManyBoxes: (prefix: string) => ipcRenderer.invoke('delete-many-boxes', prefix),
  consumirBdj: (bdjId: string, caixaDestinoId: string, operator: string) =>
    ipcRenderer.invoke('consumir-bdj', bdjId, caixaDestinoId, operator),
  createTrayFromSources: (data: any) =>
    ipcRenderer.invoke('create-tray-from-sources', data),
  getBoxLineage: (boxId: string) =>
    ipcRenderer.invoke('get-box-lineage', boxId),
  finishInsumoStep: (data: any) =>
    ipcRenderer.invoke('finish-insumo-step', data),
  // Produção Hora a Hora
  getOrCreateFicha: (data: any) =>
    ipcRenderer.invoke('producao:get-or-create-ficha', data),
  getFichaCompleta: (input: any) =>
    ipcRenderer.invoke('producao:get-ficha', input),
  addOperador: (data: any) =>
    ipcRenderer.invoke('producao:add-operador', data),
  removeOperador: (data: any) =>
    ipcRenderer.invoke('producao:remove-operador', data),
  upsertRegistro: (data: any) =>
    ipcRenderer.invoke('producao:upsert-registro', data),
  updateMetaHoraPadrao: (fichaId: number, meta: number) =>
    ipcRenderer.invoke('producao:update-meta-padrao', fichaId, meta),
  getDashboardProducao: (filtros: any) =>
    ipcRenderer.invoke('producao:get-dashboard', filtros),
  getDashboardPorEtapas: (data: string, produto?: string) =>
    ipcRenderer.invoke('producao:get-dashboard-etapas', data, produto),
});
