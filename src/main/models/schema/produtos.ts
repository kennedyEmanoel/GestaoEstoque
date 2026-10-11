import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { timestamps } from './_colunas';

export const produtos = sqliteTable('produtos', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  nome:      text('nome').notNull(),
  descricao: text('descricao'),
  /** Texto livre (ex.: "1.0", "v2"). Vazio quando o produto não tem versão. */
  versao:    text('versao').notNull().default(''),
  ativo:     integer('ativo', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
}, (t) => [
  uniqueIndex('ux_produtos_nome_versao').on(sql`lower(${t.nome})`, sql`lower(${t.versao})`),
]);
