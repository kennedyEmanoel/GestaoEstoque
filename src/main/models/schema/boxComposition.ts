import { sqliteTable as table } from 'drizzle-orm/sqlite-core';
import * as t from 'drizzle-orm/sqlite-core';
import { box } from './box';

/**
 * Rastreabilidade de composição de lotes (Split / Merge).
 *
 * Cada linha representa "X unidades saíram de sourceBox e foram para newBox".
 * Uma nova box pode ter N origens (merge); uma sourceBox pode aparecer em N
 * registros ao longo do tempo (split parcial repetido).
 */
export const boxComposition = table('box_composition', {
  id:          t.integer('id').primaryKey({ autoIncrement: true }),
  newBoxId:    t.text('new_box_id').notNull().references(() => box.id),
  sourceBoxId: t.text('source_box_id').notNull().references(() => box.id),
  amountTaken: t.integer('amount_taken').notNull(),
  createdAt:   t.integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  operator:    t.text('operator'),
});
