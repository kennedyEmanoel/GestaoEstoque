import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    build: {
    rollupOptions: {
      // Isso diz ao Vite para não tentar empacotar o SQLite
      external: ['better-sqlite3'], 
    },
  },
});
