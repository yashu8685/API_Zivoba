import { pgTable, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { workspaces } from "./workspaces.js";
import { users } from "./users.js";
import { workspaceRoleEnum } from "./enums.js";

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Unique covers the critical lookup: is user in workspace?
  (t) => [uniqueIndex("workspace_members_workspace_user_unique").on(t.workspaceId, t.userId)]
);

export type WorkspaceMember = InferSelectModel<typeof workspaceMembers>;
export type NewWorkspaceMember = InferInsertModel<typeof workspaceMembers>;
