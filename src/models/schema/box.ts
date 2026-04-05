import { sqliteTable as table } from 'drizzle-orm/sqlite-core';
import * as t from "drizzle-orm/sqlite-core";

export const box = table('box', {
  id: t.text('id').primaryKey(),
  step: t.text('etapa').notNull().default('estoque'),
  weight: t.real('weight').notNull(),
  amount: t.integer('amount').notNull().default(0),
  model: t.text('model'),
  operator: t.text('operator'),
  date: t.integer("date", { mode: "timestamp" }).$defaultFn(() => new Date())
});
