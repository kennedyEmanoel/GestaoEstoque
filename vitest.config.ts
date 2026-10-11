import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Evita carregar o postcss.config.js do app (só serve ao renderer) durante os testes.
  css: { postcss: { plugins: [] } },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
  },
});
