import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";
import { box } from "./box";

export type HistoryOperation = 'SCAN_START' | 'SCAN_END' | 'TRANSFER';
export type StepStatus = 'OPEN' | 'CLOSED';

export const history = table("history", {
  id: t.integer("id").primaryKey({ autoIncrement: true }),
  boxId: t.text("box_id").notNull().references(() => box.id),
  startTime: t.integer("start_time", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  endTime: t.integer("end_time", { mode: "timestamp" }),
  timeSpent: t.integer("time_spent"),
  typeOperation: t.text("type_operation").$type<HistoryOperation>().notNull(),
  stepStatus: t.text("step_status").$type<StepStatus>().notNull().default('OPEN'),
  step: t.text("step").notNull(),
  location: t.text("location"),
  lot: t.text("lot"),
  description: t.text("description"),
  operator: t.text("operator")
});
