import type { BoxLocation, BoxPrefix, ProductionStep } from '../main/models/schema/box';
import type { HistoryOperation, StepStatus } from '../main/models/schema/history';

export type { BoxLocation, BoxPrefix, ProductionStep, HistoryOperation, StepStatus };

// Tipos do Dashboard (copiados aqui para não criar dependência de runtime em dashboardService)
export interface DashboardFilters {
  model?: string;
  dateFrom?: number;
  dateTo?: number;
}

export interface StepFunnel {
  step: ProductionStep;
  totalUnits: number;
  boxesInStock: number;
  boxesActive: number;
  avgLeadTimeSec: number;
}

export interface CreateTrayFromSourcesInput {
  newBoxId:     string;
  model?:       string | null;
  operator:     string;
  weight?:      number;
  location?:    BoxLocation;
  description?: string;
  initialStep?: ProductionStep;
  sources: Array<{
    sourceBoxId:  string;
    amountTaken:  number;
  }>;
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

export interface DashboardData {
  totalUnitsInStock: number;
  totalUnitsInProduction: number;
  byModel: { model: string; unitsInStock: number; unitsInProduction: number }[];
  funnel: StepFunnel[];
  avgLeadTimeSec: number;
  uphLast8h: number;
  bottleneckStep: ProductionStep | null;
  availableModels: string[];
}

export interface NewBoxInput {
  id: string;
  weight: number;
  amount?: number;
  step: ProductionStep;
  model?: string | null;
  operator: string | null;
  description: string | null;
  volume: string | null;
  location?: BoxLocation;
  isInsumo?: boolean;
}

export interface BatchBoxInput {
  ids: string[];
  weight: number;
  amount?: number;
  step: ProductionStep;
  model?: string | null;
  operator: string | null;
  description: string | null;
  volume?: string | null;
  location?: BoxLocation;
  isInsumo?: boolean;
}

export interface StartStepInput {
  boxId: string;
  step: ProductionStep;
  operator: string;
  location: BoxLocation;
  description?: string;
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

export interface InsumoSource {
  boxId: string;        // ID da caixa INS de origem
  amount: number;       // quantas unidades retirar deste insumo
  stockLocation: BoxLocation; // onde guardar esta caixa INS após a operação
}

export interface FinishInsumoStepInput {
  sources: InsumoSource[];  // um ou mais insumos contribuindo para o destino
  operator: string;
  destinationId: string;    // BDJ ou produto onde as unidades vão
  destinationModel?: string | null;
  destinationStep?: ProductionStep;
  description?: string;
}

export interface StockSummary {
  inStock: number;
  inProduction: number;
  byLocation: Record<string, number>;
  byStep: Partial<Record<ProductionStep, number>>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Módulo: Controle de Produção Hora a Hora ────────────────────────────────

export type EtapaProducao = 'Montagem' | 'Soldagem' | 'Revisao' | 'Firmware' | 'IMEI';

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
      createBox: (data: NewBoxInput) => Promise<ApiResponse>;
      getNextBatchIds: (prefix: string, count: number) => Promise<ApiResponse<string[]>>;
      createBatchBoxes: (data: BatchBoxInput) => Promise<ApiResponse>;
      getBox: (id: string) => Promise<ApiResponse>;
      startStep: (data: StartStepInput) => Promise<ApiResponse>;
      finishStep: (boxId: string, operator: string, stockLocation?: string) => Promise<ApiResponse>;
      getBoxHistory: (boxId: string) => Promise<ApiResponse>;
      getRecentHistory: (limit?: number) => Promise<ApiResponse>;
      getStockSummary: () => Promise<ApiResponse<StockSummary>>;
      getDashboard: (filters: DashboardFilters) => Promise<ApiResponse<DashboardData>>;
      deleteBox: (id: string) => Promise<ApiResponse>;
      deleteManyBoxes: (prefix: string) => Promise<ApiResponse<number>>;
      expedicao: (data: ExpedicaoInput) => Promise<ApiResponse>;
      consumirBdj: (bdjId: string, caixaDestinoId: string, operator: string) => Promise<ApiResponse>;
      createTrayFromSources: (data: CreateTrayFromSourcesInput) => Promise<ApiResponse>;
      getBoxLineage: (boxId: string) => Promise<ApiResponse<BoxLineage>>;
      finishInsumoStep: (data: FinishInsumoStepInput) => Promise<ApiResponse>;
      // Produção Hora a Hora
      getOrCreateFicha: (data: CreateFichaDiariaInput) => Promise<ApiResponse<FichaDiariaCompleta>>;
      getFichaCompleta: (input: GetFichaInput) => Promise<ApiResponse<FichaDiariaCompleta | null>>;
      addOperador: (data: AddOperadorInput) => Promise<ApiResponse<OperadorDiario>>;
      removeOperador: (data: RemoveOperadorInput) => Promise<ApiResponse>;
      upsertRegistro: (data: UpsertRegistroInput) => Promise<ApiResponse<RegistroHorario>>;
      updateMetaHoraPadrao: (fichaId: number, meta: number) => Promise<ApiResponse>;
      getDashboardProducao: (filtros: DashboardProducaoFiltros) => Promise<ApiResponse<DashboardProducaoData>>;
      getDashboardPorEtapas: (data: string, produto?: string, horarioBloco?: string) => Promise<ApiResponse<DashboardPorEtapasData>>;
      openProductionWindow:  () => void;
      closeProductionWindow: () => void;
    };
  }
}
