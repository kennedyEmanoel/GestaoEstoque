import type { BoxLocation, BoxPrefix, ProductionStep } from '../main/models/schema/box';
import type { HistoryOperation, StepStatus } from '../main/models/schema/history';
import type { DashboardData, DashboardFilters } from '../main/services/dashboardService';

export type { BoxLocation, BoxPrefix, ProductionStep, HistoryOperation, StepStatus, DashboardData, DashboardFilters };

export interface NewBoxInput {
  id: string;
  weight: number;
  amount?: number;
  step: ProductionStep;
  operator: string | null;
  description: string | null;
  volume: string | null;
  location?: BoxLocation;
}

export interface BatchBoxInput {
  ids: string[];
  weight: number;
  amount?: number;
  step: ProductionStep;
  model?: string;
  operator: string | null;
  description: string | null;
  volume?: string | null;
  location?: BoxLocation;
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
    };
  }
}
