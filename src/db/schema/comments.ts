import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { cards } from "./cards.js";
import { users } from "./users.js";

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    // Soft delete: set instead of hard DELETE
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  // Critical: open card → its comments.
  (t) => [index("comments_card_id_idx").on(t.cardId)]
);

export type Comment = InferSelectModel<typeof comments>;
export type NewComment = InferInsertModel<typeof comments>;
