import { pgTable, serial, integer, varchar, text, date, timestamp, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { lists } from "./lists.js";
import { users } from "./users.js";
import { cardPriorityEnum } from "./enums.js";

export const cards = pgTable(
  "cards",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
      assigneeId: integer("assignee_id")
  .references(() => users.id, { onDelete: "set null" }),
    title: varchar("title", { length: 255 }).notNull(),
    // Separate column; app generates from title on create.
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    priority: cardPriorityEnum("priority").notNull().default("medium"),
    dueDate: date("due_date"),
    position: integer("position").notNull().default(0),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    // Soft delete: set instead of hard DELETE
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  // Critical: open list → its cards. Without this, full scan.
  (t) => [index("cards_list_id_idx").on(t.listId)]
);

export type Card = InferSelectModel<typeof cards>;
export type NewCard = InferInsertModel<typeof cards>;
