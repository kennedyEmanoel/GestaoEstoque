import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { timestamps } from './_colunas';

export const etapas = sqliteTable('etapas', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  nome:      text('nome').notNull(),
  descricao: text('descricao'),
  ativo:     integer('ativo', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
}, (t) => [
  uniqueIndex('ux_etapas_nome').on(sql`lower(${t.nome})`),
]);

/** Tipos de uma etapa (ex.: Soldagem → Cabos, Retrabalho; Gravação → Firmware, IMEI, Serial). */
export const etapaVariacoes = sqliteTable('etapa_variacoes', {
  id:      integer('id').primaryKey({ autoIncrement: true }),
  etapaId: integer('etapa_id').notNull().references(() => etapas.id, { onDelete: 'restrict' }),
  nome:    text('nome').notNull(),
  ativo:   integer('ativo', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
}, (t) => [
  index('idx_variacoes_etapa').on(t.etapaId),
  uniqueIndex('ux_variacoes_etapa_nome').on(t.etapaId, sql`lower(${t.nome})`),
]);
