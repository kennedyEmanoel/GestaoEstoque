import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'better-sqlite3',
        'drizzle-orm',
        /^drizzle-orm\/.*/,
        /.*\/worker\/dbWorker(\.js)?$/,
      ],
    },
  },
});
