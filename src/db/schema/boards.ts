import { pgTable, serial, integer, varchar, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { workspaces } from "./workspaces.js";
import { users } from "./users.js";

export const boards = pgTable(
  "boards",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 150 }).notNull(),
    // Separate column; app generates from name on create, dedupes per workspace.
    slug: varchar("slug", { length: 150 }).notNull(),
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
  // Unique covers listing boards in a workspace + blocks duplicates (slug scoped like name)
  (t) => [
    uniqueIndex("boards_workspace_name_unique").on(t.workspaceId, t.name),
    uniqueIndex("boards_workspace_slug_unique").on(t.workspaceId, t.slug),
  ]
);

export type Board = InferSelectModel<typeof boards>;
export type NewBoard = InferInsertModel<typeof boards>;
