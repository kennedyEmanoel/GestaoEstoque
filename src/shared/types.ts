export interface DashboardFilters {
  model?: string;
  dateFrom?: number;
  dateTo?: number;
}

export interface BoxCompositionRecord {
  compositionId: number;
  sourceBoxId:   string;
  newBoxId:      string;
  amountTaken:   number;
  createdAt:     Date | number;
  operator:      string | null;
}

export interface BoxLineage {
  boxId:        string;
  ascendentes:  Array<BoxCompositionRecord & { sourceModel: string | null; sourceStep: string | null; sourceAmount: number | null }>;
  descendentes: Array<BoxCompositionRecord & { destModel:   string | null; destStep:   string | null; destAmount:   number | null }>;
}

export interface ExpedicaoInput {
  boxId: string;
  operator: string;
  filialDestino: string;
  description?: string;
}

export interface ConsumirBdjInput {
  bdjId: string;
  caixaDestinoId: string;
  operator: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Módulo: Controle de Produção Hora a Hora ────────────────────────────────

export type EtapaProducao = 'Montagem' | 'Soldagem' | 'Revisão' | 'Firmware' | 'IMEI';

export interface FichaDiaria {
  id: number;
  data: string;
  produto: string;
  etapa: EtapaProducao;
  metaHoraPadrao: number;
  criadoEm: number;
}

export interface OperadorDiario {
  id: number;
  fichaId: number;
  operadorNome: string;
  ordem: number;
}

export interface RegistroHorario {
  id: number;
  operadorDiarioId: number;
  horarioBloco: string;
  meta: number;
  realizado: number;
}

export interface FichaDiariaCompleta extends FichaDiaria {
  operadores: Array<OperadorDiario & {
    registros: RegistroHorario[];
  }>;
}

export interface CreateFichaDiariaInput {
  data: string;
  produto: string;
  etapa: EtapaProducao;
  metaHoraPadrao: number;
}

export interface AddOperadorInput {
  fichaId: number;
  operadorNome: string;
}

export interface RemoveOperadorInput {
  operadorDiarioId: number;
}

export interface UpsertRegistroInput {
  operadorDiarioId: number;
  horarioBloco: string;
  meta: number;
  realizado: number;
}

export interface GetFichaInput {
  data: string;
  etapa: EtapaProducao;
  produto: string;
}

export interface DashboardProducaoFiltros {
  data: string;
  etapa?: string;
  produto?: string;
}

export interface KpiProducao {
  totalRealizado: number;
  totalMeta: number;
  saldo: number;
  pctAtingimento: number | null;
}

export interface DadosPorHora {
  horarioBloco: string;
  realizado: number;
  meta: number;
}

export interface DadosPorOperador {
  operadorNome: string;
  totalRealizado: number;
  totalMeta: number;
}

export interface SaldoAcumulado {
  horarioBloco: string;
  saldoAcumulado: number;
}

export interface DashboardProducaoData {
  kpi: KpiProducao;
  porHora: DadosPorHora[];
  porOperador: DadosPorOperador[];
  saldoAcumulado: SaldoAcumulado[];
  etapasDisponiveis: string[];
  produtosDisponiveis: string[];
}

export interface EtapaResumo {
  etapa: string;
  produto: string;
  totalRealizado: number;
  totalMeta: number;
  saldo: number;
  pctAtingimento: number | null;
  porOperador: DadosPorOperador[];
  porHora: DadosPorHora[];
}

export interface DashboardPorEtapasData {
  data: string;
  produto: string;
  totalGeral: { realizado: number; meta: number };
  etapas: EtapaResumo[];
}

declare global {
  interface Window {
    api: {
      getOrCreateFicha: (data: CreateFichaDiariaInput) => Promise<ApiResponse<FichaDiariaCompleta>>;
      getFichaCompleta: (input: GetFichaInput) => Promise<ApiResponse<FichaDiariaCompleta | null>>;
      addOperador: (data: AddOperadorInput) => Promise<ApiResponse<OperadorDiario>>;
      removeOperador: (data: RemoveOperadorInput) => Promise<ApiResponse>;
      upsertRegistro: (data: UpsertRegistroInput) => Promise<ApiResponse<RegistroHorario>>;
      updateMetaHoraPadrao: (fichaId: number, meta: number) => Promise<ApiResponse>;
      getDashboardProducao: (filtros: DashboardProducaoFiltros) => Promise<ApiResponse<DashboardProducaoData>>;
      getDashboardPorEtapas: (data: string, produto?: string, horarioBloco?: string) => Promise<ApiResponse<DashboardPorEtapasData>>;
      openProductionWindow:       () => void;
      closeProductionWindow:      () => void;
      openProductionWindowGeral:  () => void;
      closeProductionWindowGeral: () => void;
      sendDashboardCommand:       (payload: DashboardCommand) => void;
      sendDashboardGeralCommand:  (payload: DashboardCommand) => void;
      onDashboardCommand:         (cb: (payload: DashboardCommand) => void) => void;
      offDashboardCommand:        () => void;
      onDashboardGeralCommand:    (cb: (payload: DashboardCommand) => void) => void;
      offDashboardGeralCommand:   () => void;
      getServerUrl:               () => Promise<string | null>;
    };
  }
}

// ─── Comandos do Controle de Produção → Dashboard ─────────────────────────────

export type DashboardCommand =
  | { type: 'refresh';      data: string; produto: string; faixa: string }
  | { type: 'alert';        mensagem: string }
  | { type: 'alert-image';  mensagem: string; imagemBase64: string; mimeType?: string };
