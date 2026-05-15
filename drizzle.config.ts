import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/main/models/schema/*.ts',
  out: './drizzle',            
  dialect: 'sqlite',
  dbCredentials: {
    url: 'C:/Users/kenne/AppData/Roaming/gestaoestoque/bd_estoque.sqlite', 
  },
});