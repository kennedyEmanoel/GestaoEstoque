import { sqliteTable as table } from 'drizzle-orm/sqlite-core';
import * as t from "drizzle-orm/sqlite-core";

export type BoxPrefix = 'BDJ' | 'NB2' | '4GS' | 'LOR' | 'NBL';

export type ProductionStep =
  | 'Separacao'
  | 'Montagem'
  | 'Soldagem'
  | 'Revisao'
  | 'Firmware'
  | 'IMEI'
  | 'Concluida'
  | 'Consumida';

export type BoxLocation =
  | 'ESTOQUE'
  | 'ARMARIO_A' | 'ARMARIO_B' | 'ARMARIO_C' | 'ARMARIO_D' | 'ARMARIO_E'
  | 'ARMARIO_F' | 'ARMARIO_G' | 'ARMARIO_H' | 'ARMARIO_I' | 'ARMARIO_J'
  | 'ARMARIO_K' | 'ARMARIO_L' | 'ARMARIO_M' | 'ARMARIO_N' | 'ARMARIO_O'
  | 'MONTAGEM_01' | 'MONTAGEM_02'
  | 'SOLDAGEM_01' | 'SOLDAGEM_02' | 'SOLDAGEM_03' | 'SOLDAGEM_04'
  | 'REVISAO_01' | 'REVISAO_02' | 'REVISAO_03' | 'REVISAO_04'
  | 'GRAVACAO_01' | 'GRAVACAO_02' | 'GRAVACAO_03' | 'GRAVACAO_04' | 'GRAVACAO_05' | 'GRAVACAO_06';

export const STOCK_LOCATIONS: BoxLocation[] = [
  'ESTOQUE',
  'ARMARIO_A', 'ARMARIO_B', 'ARMARIO_C', 'ARMARIO_D', 'ARMARIO_E',
  'ARMARIO_F', 'ARMARIO_G', 'ARMARIO_H', 'ARMARIO_I', 'ARMARIO_J',
  'ARMARIO_K', 'ARMARIO_L', 'ARMARIO_M', 'ARMARIO_N', 'ARMARIO_O',
];

export const box = table('box', {
  id: t.text('id').primaryKey(),
  model: t.text('model'),
  amount: t.integer('amount').notNull().default(500),
  step: t.text('step').$type<ProductionStep>().notNull(),
  volume: t.text('volume'),
  origin: t.text('origin').$type<'PRODUCTION' | 'TRAY'>().default('PRODUCTION'),
  location: t.text('location').default('ESTOQUE'),
  weight: t.real('weight').notNull(),
  operator: t.text('operator'),
  description: t.text('description'),
  date: t.integer("date", { mode: "timestamp" }).$defaultFn(() => new Date()),
  parentId: t.text('parent_id'),
  isInsumo: t.integer('is_insumo', { mode: 'boolean' }).notNull().default(false),
});
