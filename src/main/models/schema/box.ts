import { sqliteTable as table } from 'drizzle-orm/sqlite-core';
import * as t from "drizzle-orm/sqlite-core";

export type BoxPrefix = 'BDJ' | 'NB2' | '4GS' | 'LOR' | 'NBL' | 'INS';

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
  | 'ARM_A' | 'ARM_B' | 'ARM_C' | 'ARM_D' | 'ARM_E'
  | 'ARM_F' | 'ARM_G' | 'ARM_H' | 'ARM_I' | 'ARM_J'
  | 'ARM_K' | 'ARM_L' | 'ARM_M' | 'ARM_N' | 'ARM_O'
  | 'MONT_01' | 'MONT_02'
  | 'SOLD_01' | 'SOLD_02' | 'SOLD_03' | 'SOLD_04'
  | 'REVI_01' | 'REVI_02' | 'REVI_03' | 'REVI_04'
  | 'GRAV_01' | 'GRAV_02' | 'GRAV_03' | 'GRAV_04' | 'GRAV_05' | 'GRAV_06';

export const STOCK_LOCATIONS: BoxLocation[] = [
  'ESTOQUE',
  'ARM_A', 'ARM_B', 'ARM_C', 'ARM_D', 'ARM_E',
  'ARM_F', 'ARM_G', 'ARM_H', 'ARM_I', 'ARM_J',
  'ARM_K', 'ARM_L', 'ARM_M', 'ARM_N', 'ARM_O',
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
