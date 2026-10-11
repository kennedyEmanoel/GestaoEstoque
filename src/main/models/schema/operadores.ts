import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { timestamps } from './_colunas';

export const operadores = sqliteTable('operadores', {
  id:    integer('id').primaryKey({ autoIncrement: true }),
  nome:  text('nome').notNull(),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
}, (t) => [
  uniqueIndex('ux_operadores_nome').on(sql`lower(${t.nome})`),
]);
