// src/models/schema/history.ts
import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";

import { box } from "./box"; 

export const history = table("history", {
  id: t.integer("id").primaryKey({ autoIncrement: true }),
  boxId: t.text("box_id").notNull().references(() => box.id),
  startTime: t.integer("start_time", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  endTime: t.integer("end_time", { mode: "timestamp" }),
  timeSpent: t.integer("timeSpent", { mode: "timestamp" }),
  typeOperation: t.text("operation").notNull(),
  step: t.text("step").notNull(),
  location: t.text("location"),
  operator: t.text("operator")
});