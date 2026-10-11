import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, index, unique, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { operadores } from './operadores';
import { produtos } from './produtos';
import { etapas, etapaVariacoes } from './etapas';

/**
 * Cartão (ficha) de produção do dia: uma data + produto + etapa (+ variação opcional).
 * A unicidade é garantida por dois índices parciais, porque no SQLite NULL != NULL
 * e um único índice não impediria duas fichas "sem variação" iguais.
 */
export const producaoFichaDiaria = sqliteTable('producao_ficha_diaria', {
  id:             integer('id').primaryKey({ autoIncrement: true }),
  data:           text('data').notNull(),
  produtoId:      integer('produto_id').notNull().references(() => produtos.id, { onDelete: 'restrict' }),
  etapaId:        integer('etapa_id').notNull().references(() => etapas.id, { onDelete: 'restrict' }),
  variacaoId:     integer('variacao_id').references(() => etapaVariacoes.id, { onDelete: 'restrict' }),
  metaHoraPadrao: integer('meta_hora_padrao').notNull().default(40),
  criadoEm:       integer('criado_em').notNull(),
}, (t) => [
  index('idx_ficha_data_etapa').on(t.data, t.etapaId),
  uniqueIndex('ux_ficha_sem_variacao').on(t.data, t.produtoId, t.etapaId).where(sql`${t.variacaoId} IS NULL`),
  uniqueIndex('ux_ficha_com_variacao').on(t.data, t.produtoId, t.etapaId, t.variacaoId).where(sql`${t.variacaoId} IS NOT NULL`),
]);

/** Operador escalado em uma ficha. */
export const producaoOperadorDiario = sqliteTable('producao_operador_diario', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  fichaId:    integer('ficha_id').notNull().references(() => producaoFichaDiaria.id, { onDelete: 'cascade' }),
  operadorId: integer('operador_id').notNull().references(() => operadores.id, { onDelete: 'restrict' }),
  ordem:      integer('ordem').notNull().default(0),
}, (t) => [
  unique().on(t.fichaId, t.operadorId),
  index('idx_operador_ficha').on(t.fichaId),
  index('idx_operador_diario_operador').on(t.operadorId),
]);

export const producaoRegistroHorario = sqliteTable('producao_registro_horario', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  operadorDiarioId: integer('operador_diario_id').notNull().references(() => producaoOperadorDiario.id, { onDelete: 'cascade' }),
  horarioBloco:     text('horario_bloco').notNull(),
  meta:             integer('meta').notNull().default(0),
  realizado:        integer('realizado').notNull().default(0),
}, (t) => [
  unique().on(t.operadorDiarioId, t.horarioBloco),
  index('idx_registro_op').on(t.operadorDiarioId),
]);
