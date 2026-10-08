/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

interface Window {
  api: {
    createBox: (data: {
      id: string;
      model: string;
      amount: string;
      weight: string;
      operator: string;
      step: string;
    }) => Promise<{ success: boolean; error?: string }>;

    getBox: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  };
}