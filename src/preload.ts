import { contextBridge, ipcRenderer } from 'electron';
import type { FiltroAnalise } from './shared/analise';
import type {
  AddOperadorInput,
  CreateFichaDiariaInput,
  DashboardCommand,
  FiltroCadastro,
  GetFichaInput,
  RemoveOperadorInput,
  UpsertRegistroInput,
} from './shared/types';

/** Os cinco canais padrão de um cadastro (ver registrarCrud no processo principal). */
const crud = (prefixo: string) => ({
  listar:       (filtro?: FiltroCadastro) => ipcRenderer.invoke(`${prefixo}:listar`, filtro),
  criar:        (input: unknown) => ipcRenderer.invoke(`${prefixo}:criar`, input),
  atualizar:    (id: number, input: unknown) => ipcRenderer.invoke(`${prefixo}:atualizar`, id, input),
  definirAtivo: (id: number, ativo: boolean) => ipcRenderer.invoke(`${prefixo}:definir-ativo`, id, ativo),
  remover:      (id: number) => ipcRenderer.invoke(`${prefixo}:remover`, id),
  impacto:      (id: number) => ipcRenderer.invoke(`${prefixo}:impacto`, id),
});

contextBridge.exposeInMainWorld('api', {
  // Cadastros
  operadores: crud('operadores'),
  produtos:   crud('produtos'),
  etapas:     crud('etapas'),
  variacoes:  crud('variacoes'),

  analise: {
    opcoes: () => ipcRenderer.invoke('analise:opcoes'),
    desempenho: (filtro: FiltroAnalise) => ipcRenderer.invoke('analise:desempenho', filtro),
  },

  // Produção hora a hora
  getOrCreateFicha: (data: CreateFichaDiariaInput) =>
    ipcRenderer.invoke('producao:get-or-create-ficha', data),
  getFichaCompleta: (input: GetFichaInput) =>
    ipcRenderer.invoke('producao:get-ficha', input),
  getFichaPorId: (id: number) =>
    ipcRenderer.invoke('producao:get-ficha-por-id', id),
  impactoDoCartao: (id: number) =>
    ipcRenderer.invoke('producao:impacto-cartao', id),
  removerCartao: (id: number) =>
    ipcRenderer.invoke('producao:remover-cartao', id),
  listarCartoesDoDia: (data: string) =>
    ipcRenderer.invoke('producao:cartoes-do-dia', data),
  listarDiasComRegistro: (limite?: number) =>
    ipcRenderer.invoke('producao:dias-com-registro', limite),
  addOperador: (data: AddOperadorInput) =>
    ipcRenderer.invoke('producao:add-operador', data),
  removeOperador: (data: RemoveOperadorInput) =>
    ipcRenderer.invoke('producao:remove-operador', data),
  upsertRegistro: (data: UpsertRegistroInput) =>
    ipcRenderer.invoke('producao:upsert-registro', data),
  updateMetaHoraPadrao: (fichaId: number, meta: number) =>
    ipcRenderer.invoke('producao:update-meta-padrao', fichaId, meta),
  getDashboardPorEtapas: (data: string, produtoId?: number | null, horarioBloco?: string) =>
    ipcRenderer.invoke('producao:get-dashboard-etapas', data, produtoId, horarioBloco),

  // Janelas dos painéis
  openProductionWindow: () =>
    ipcRenderer.send('open-production-window'),
  closeProductionWindow: () =>
    ipcRenderer.send('close-production-window'),
  openProductionWindowGeral: () =>
    ipcRenderer.send('open-production-window-geral'),
  closeProductionWindowGeral: () =>
    ipcRenderer.send('close-production-window-geral'),
  sendDashboardCommand: (payload: DashboardCommand) =>
    ipcRenderer.send('dashboard-command', payload),
  sendDashboardGeralCommand: (payload: DashboardCommand) =>
    ipcRenderer.send('dashboard-geral-command', payload),
  onDashboardCommand: (cb: (payload: DashboardCommand) => void) => {
    ipcRenderer.on('dashboard-command', (_e, p) => cb(p));
  },
  offDashboardCommand: () => {
    ipcRenderer.removeAllListeners('dashboard-command');
  },
  onDashboardGeralCommand: (cb: (payload: DashboardCommand) => void) => {
    ipcRenderer.on('dashboard-geral-command', (_e, p) => cb(p));
  },
  offDashboardGeralCommand: () => {
    ipcRenderer.removeAllListeners('dashboard-geral-command');
  },

  // Servidor da rede local
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  openServerUrl: () => ipcRenderer.send('open-server-url'),
});
