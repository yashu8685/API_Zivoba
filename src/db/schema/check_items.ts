import { pgTable, serial, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { checklists } from "./checklists.js";

// Checklist items — hard delete with checklist (cascade)
export const checkItems = pgTable(
  "check_items",
  {
    id: serial("id").primaryKey(),
    checklistId: integer("checklist_id")
      .notNull()
      .references(() => checklists.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    done: boolean("done").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // Critical: open checklist → its items.
  (t) => [index("check_items_checklist_id_idx").on(t.checklistId)]
);

export type CheckItem = InferSelectModel<typeof checkItems>;
export type NewCheckItem = InferInsertModel<typeof checkItems>;
