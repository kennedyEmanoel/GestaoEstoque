import type { BoxLocation, BoxPrefix, ProductionStep } from '../main/models/schema/box';
import type { HistoryOperation } from '../main/models/schema/history';
import type { DashboardData, DashboardFilters } from '../main/services/dashboardService';

export type { BoxLocation, BoxPrefix, ProductionStep, HistoryOperation, DashboardData, DashboardFilters };

export interface NewBoxInput {
  id: string;
  weight: number;
  amount?: number;
  step: ProductionStep;
  model: string | null;
  operator: string | null;
  description: string | null;
  volume: string | null;
  location?: BoxLocation;
}

export interface ScanInput {
  boxId: string;
  step: ProductionStep;
  operator: string;
  location: BoxLocation;
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
      getBox: (id: string) => Promise<ApiResponse>;
      scanBox: (data: ScanInput) => Promise<ApiResponse>;
      finishStep: (boxId: string, operator: string) => Promise<ApiResponse>;
      getBoxHistory: (boxId: string) => Promise<ApiResponse>;
      getStockSummary: () => Promise<ApiResponse<StockSummary>>;
      getDashboard: (filters: DashboardFilters) => Promise<ApiResponse<DashboardData>>;
    };
  }
}
