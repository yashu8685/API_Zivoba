import { pgTable, serial, integer, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { users } from "./users.js";

export const workspaces = pgTable(
  "workspaces",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 150 }).notNull().unique(),
    // Separate column; app generates from name on create, dedupes with -2/-3.
    slug: varchar("slug", { length: 150 }).notNull().unique(),
    description: text("description"),
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
  (t) => [index("workspaces_created_by_idx").on(t.createdBy)]
);

export type Workspace = InferSelectModel<typeof workspaces>;
export type NewWorkspace = InferInsertModel<typeof workspaces>;
