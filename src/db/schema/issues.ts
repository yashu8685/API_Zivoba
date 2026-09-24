import { pgTable, serial, integer, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { cards } from "./cards.js";
import { users } from "./users.js";
import { issueStatusEnum, cardPriorityEnum } from "./enums.js";

export const issues = pgTable(
  "issues",
  {
    id: serial("id").primaryKey(),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    // Separate column; app generates from title on create.
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    status: issueStatusEnum("status").notNull().default("open"),
    priority: cardPriorityEnum("priority").notNull().default("medium"),
    assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
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
  // Critical: open card → its issues.
  (t) => [index("issues_card_id_idx").on(t.cardId)]
);

export type Issue = InferSelectModel<typeof issues>;
export type NewIssue = InferInsertModel<typeof issues>;
