/**
 * Tipos globais do Renderer Process.
 *
 * Este arquivo declara window.api (exposto via contextBridge no preload.ts)
 * para que o TypeScript e o Vite resolvam os tipos sem precisar importar
 * módulos Node.js (drizzle, better-sqlite3, etc.) no bundle do Renderer.
 *
 * Mantenha este arquivo em sincronia com src/preload.ts.
 */

// ─── Tipos de domínio (sem imports Node) ────────────────────────────────────

type ProductionStep =
  | 'Separacao' | 'Montagem' | 'Soldagem' | 'Revisao'
  | 'Firmware'  | 'IMEI'     | 'Concluida' | 'Consumida';

type BoxPrefix = 'BDJ' | 'NB2' | '4GS' | 'LOR' | 'NBL' | 'INS';

type BoxLocation =
  | 'ESTOQUE'
  | 'ARM_A' | 'ARM_B' | 'ARM_C' | 'ARM_D' | 'ARM_E'
  | 'ARM_F' | 'ARM_G' | 'ARM_H' | 'ARM_I' | 'ARM_J'
  | 'ARM_K' | 'ARM_L' | 'ARM_M' | 'ARM_N' | 'ARM_O'
  | 'MONT_01' | 'MONT_02'
  | 'SOLD_01' | 'SOLD_02' | 'SOLD_03' | 'SOLD_04'
  | 'REVI_01' | 'REVI_02' | 'REVI_03' | 'REVI_04'
  | 'GRAV_01' | 'GRAV_02' | 'GRAV_03'
  | 'GRAV_04' | 'GRAV_05' | 'GRAV_06';

interface NewBoxInput {
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

interface BatchBoxInput {
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

interface StartStepInput {
  boxId: string;
  step: ProductionStep;
  operator: string;
  location: BoxLocation;
  description?: string;
}

interface ExpedicaoInput {
  boxId: string;
  operator: string;
  filialDestino: string;
  description?: string;
}

interface InsumoSource {
  boxId: string;
  amount: number;
  stockLocation: BoxLocation;
}

interface FinishInsumoStepInput {
  sources: InsumoSource[];
  operator: string;
  destinationId: string;
  destinationModel?: string | null;
  destinationStep?: ProductionStep;
  description?: string;
}

interface StockSummary {
  inStock: number;
  inProduction: number;
  byLocation: Record<string, number>;
  byStep: Partial<Record<ProductionStep, number>>;
}

interface StepFunnel {
  step: ProductionStep;
  totalUnits: number;
  boxesInStock: number;
  boxesActive: number;
  avgLeadTimeSec: number;
}

interface DashboardFilters {
  model?: string;
  dateFrom?: number;
  dateTo?: number;
}

interface DashboardData {
  totalUnitsInStock: number;
  totalUnitsInProduction: number;
  byModel: { model: string; unitsInStock: number; unitsInProduction: number }[];
  funnel: StepFunnel[];
  avgLeadTimeSec: number;
  uphLast8h: number;
  bottleneckStep: ProductionStep | null;
  availableModels: string[];
}

interface CreateTrayFromSourcesInput {
  newBoxId:     string;
  model?:       string | null;
  operator:     string;
  weight?:      number;
  location?:    BoxLocation;
  description?: string;
  sources: Array<{
    sourceBoxId: string;
    amountTaken: number;
  }>;
}

interface BoxCompositionEntry {
  compositionId: number;
  sourceBoxId:   string;
  newBoxId:      string;
  amountTaken:   number;
  createdAt:     number | null;
  operator:      string | null;
  sourceModel?:  string | null;
  sourceStep?:   string | null;
  sourceAmount?: number | null;
  destModel?:    string | null;
  destStep?:     string | null;
  destAmount?:   number | null;
}

interface BoxLineage {
  boxId:        string;
  ascendentes:  BoxCompositionEntry[];
  descendentes: BoxCompositionEntry[];
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Declaração global de window.api ────────────────────────────────────────

declare global {
  interface Window {
    api: {
      createBox:        (data: NewBoxInput)                                                    => Promise<ApiResponse>;
      getNextBatchIds:  (prefix: BoxPrefix | string, count: number)                            => Promise<ApiResponse<string[]>>;
      createBatchBoxes: (data: BatchBoxInput)                                                  => Promise<ApiResponse>;
      getBox:           (id: string)                                                           => Promise<ApiResponse>;
      startStep:        (data: StartStepInput)                                                 => Promise<ApiResponse>;
      finishStep:       (boxId: string, operator: string, stockLocation?: BoxLocation | string) => Promise<ApiResponse>;
      getBoxHistory:    (boxId: string)                                                        => Promise<ApiResponse<unknown[]>>;
      getRecentHistory: (limit?: number)                                                       => Promise<ApiResponse<unknown[]>>;
      getStockSummary:  ()                                                                     => Promise<ApiResponse<StockSummary>>;
      getDashboard:     (filters: DashboardFilters)                                            => Promise<ApiResponse<DashboardData>>;
      deleteBox:        (id: string)                                                           => Promise<ApiResponse>;
      deleteManyBoxes:  (prefix: BoxPrefix | string)                                           => Promise<ApiResponse<number>>;
      expedicao:        (data: ExpedicaoInput)                                                 => Promise<ApiResponse>;
      consumirBdj:           (bdjId: string, caixaDestinoId: string, operator: string) => Promise<ApiResponse>;
      createTrayFromSources: (data: CreateTrayFromSourcesInput)                        => Promise<ApiResponse>;
      getBoxLineage:         (boxId: string)                                           => Promise<ApiResponse<BoxLineage>>;
      finishInsumoStep:      (data: FinishInsumoStepInput)                             => Promise<ApiResponse>;
      openProductionWindow:  ()                                                        => void;
      closeProductionWindow: ()                                                        => void;
    };
  }
}

export {};
