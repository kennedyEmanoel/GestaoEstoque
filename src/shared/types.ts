export interface NewBoxInput {
  id: string;
  weight: number;
  amount: number;
  step: string;
  model: string | null;
  operator: string | null;
  description: string | null;
  volume: string | null;
  location?: string;
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
    };
  }
}
