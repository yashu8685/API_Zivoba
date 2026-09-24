// Workspace-scoped labels — soft delete (keep card history).
import { pgTable, serial, integer, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { workspaces } from "./workspaces.js";

export const labels = pgTable(
  "labels",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    // Separate column; app generates from name on create, dedupes per workspace.
    slug: varchar("slug", { length: 50 }).notNull(),
    color: varchar("color", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    // Soft delete: set instead of hard DELETE
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  // Unique covers workspace → labels + blocks duplicate names (slug scoped like name)
  (t) => [
    uniqueIndex("labels_workspace_name_unique").on(t.workspaceId, t.name),
    uniqueIndex("labels_workspace_slug_unique").on(t.workspaceId, t.slug),
  ]
);

export type Label = InferSelectModel<typeof labels>;
export type NewLabel = InferInsertModel<typeof labels>;
