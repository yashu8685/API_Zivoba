import { pgTable, serial, integer, varchar, timestamp,boolean, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { cards } from "./cards.js";

// Board modal checklists — hard delete with card (cascade)
export const checklists = pgTable(
  "checklists",
  {
    id: serial("id").primaryKey(),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 150 }).notNull(),
    // Separate column; app generates from title on create.
    slug: varchar("slug", { length: 150 }).notNull(),
    position: integer("position").notNull().default(0),
    isCompleted: boolean("is_completed")
  .notNull()
  .default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // Critical: open card → its checklists.
  (t) => [index("checklists_card_id_idx").on(t.cardId)]
);

export type Checklist = InferSelectModel<typeof checklists>;
export type NewChecklist = InferInsertModel<typeof checklists>;
