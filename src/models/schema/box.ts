import { sqliteTable as table } from 'drizzle-orm/sqlite-core';
import * as t from "drizzle-orm/sqlite-core";


export const box = table('box', {
  id: t.text('id').primaryKey(),
  model: t.text('model'),
  amount: t.integer('amount').notNull().default(0),
  step: t.text('step').notNull(), 
  volume: t.text('volume'), 
  origin: t.text('origin').$type<'RAW' | 'PRODUCTION' | 'TRAY'>().default('RAW'),
  location: t.text('location').$type<
    'ESTOQUE' | 
    'ARMARIO_A' | 'ARMARIO_B' | 'ARMARIO_C' | 'ARMARIO_D' | 'ARMARIO_E' |
    'MONTAGEM_01' | 'MONTAGEM_02' |
    'SOLDAGEM_01' | 'SOLDAGEM_02' | 'SOLDAGEM_03' | 'SOLDAGEM_04' |
    'REVISAO_01' | 'REVISAO_02' | 'REVISAO_03' | 'REVISAO_04' |
    'GRAVACAO_01' | 'GRAVACAO_02' | 'GRAVACAO_03' | 'GRAVACAO_04' | 'GRAVACAO_05' | 'GRAVACAO_06'
  >().default('ESTOQUE'),
  
  weight: t.real('weight').notNull(),
  operator: t.text('operator'),
  description: t.text('description'),
  date: t.integer("date", { mode: "timestamp" }).$defaultFn(() => new Date())
});