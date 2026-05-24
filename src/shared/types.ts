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
    };
  }
}
