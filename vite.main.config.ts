import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'better-sqlite3',
        'express',
        'cors',
        /.*\/worker\/dbWorker(\.js)?$/,
      ],
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  ssr: {
    noExternal: [/^drizzle-orm/],
  },
});
