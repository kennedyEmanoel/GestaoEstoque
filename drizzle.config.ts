import { defineConfig } from 'drizzle-kit';

// O schema é a fonte da verdade. Para gerar uma migração depois de alterá-lo:
//   npx drizzle-kit generate --name <descricao>
// As migrações geradas ficam em ./drizzle e são aplicadas pelo app na inicialização.
export default defineConfig({
  schema: './src/main/models/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
});
