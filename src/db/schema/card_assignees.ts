import { pgTable, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { cards } from "./cards.js";
import { users } from "./users.js";

// Junction: hard delete (remove row when unassigned)
export const cardAssignees = pgTable(
  "card_assignees",
  {
    id: serial("id").primaryKey(),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Unique covers card → assignees lookup + blocks duplicates
  (t) => [uniqueIndex("card_assignees_card_user_unique").on(t.cardId, t.userId)]
);

export type CardAssignee = InferSelectModel<typeof cardAssignees>;
export type NewCardAssignee = InferInsertModel<typeof cardAssignees>;
