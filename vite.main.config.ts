import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'better-sqlite3',
        // O worker é compilado como entry separado; não deve ser bundlado no main.
        /.*\/worker\/dbWorker(\.js)?$/,
      ],
    },
  },
});
