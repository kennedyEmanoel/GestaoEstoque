import { sqliteTable as table } from 'drizzle-orm/sqlite-core';
import * as t from "drizzle-orm/sqlite-core";

export const box = table('box', {
  id: t.text('id').primaryKey(),
  model: t.text('model'),
  amount: t.integer('amount').notNull().default(0),
  step: t.text('etapa').notNull(),
  location: t.text('location').default('Estoque'),
  weight: t.real('weight').notNull(),
  operator: t.text('operator'),
  description:t.text('description'),
  date: t.integer("date", { mode: "timestamp" }).$defaultFn(() => new Date())
});
