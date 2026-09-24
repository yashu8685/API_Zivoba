import { pgTable, serial, integer, varchar, timestamp, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { boards } from "./boards.js";

export const lists = pgTable(
  "lists",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 150 }).notNull(),
    // Separate column; app generates from title on create.
    slug: varchar("slug", { length: 150 }).notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    // Soft delete: set instead of hard DELETE
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  // Critical: open board → its lists.
  (t) => [index("lists_board_id_idx").on(t.boardId)]
);

export type List = InferSelectModel<typeof lists>;
export type NewList = InferInsertModel<typeof lists>;
