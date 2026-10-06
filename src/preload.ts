import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
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
  getDashboardPorEtapas: (data: string, produto?: string, horarioBloco?: string) =>
    ipcRenderer.invoke('producao:get-dashboard-etapas', data, produto, horarioBloco),
  openProductionWindow: () =>
    ipcRenderer.send('open-production-window'),
  closeProductionWindow: () =>
    ipcRenderer.send('close-production-window'),
  openProductionWindowGeral: () =>
    ipcRenderer.send('open-production-window-geral'),
  closeProductionWindowGeral: () =>
    ipcRenderer.send('close-production-window-geral'),
  sendDashboardCommand: (payload: unknown) =>
    ipcRenderer.send('dashboard-command', payload),
  sendDashboardGeralCommand: (payload: unknown) =>
    ipcRenderer.send('dashboard-geral-command', payload),
  onDashboardCommand: (cb: (payload: unknown) => void) => {
    ipcRenderer.on('dashboard-command', (_e, p) => cb(p));
  },
  offDashboardCommand: () => {
    ipcRenderer.removeAllListeners('dashboard-command');
  },
  onDashboardGeralCommand: (cb: (payload: unknown) => void) => {
    ipcRenderer.on('dashboard-geral-command', (_e, p) => cb(p));
  },
  offDashboardGeralCommand: () => {
    ipcRenderer.removeAllListeners('dashboard-geral-command');
  },
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
});
