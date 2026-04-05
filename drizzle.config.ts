import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/models/schema', 
  
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'sqlite.db'
  }
}); 
