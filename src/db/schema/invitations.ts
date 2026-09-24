import { pgTable, serial, integer, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { workspaces } from "./workspaces.js";
import { users } from "./users.js";
import { workspaceRoleEnum } from "./enums.js";

// Ephemeral: hard delete once accepted/expired
export const invitations = pgTable(
  "invitations",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    role: workspaceRoleEnum("role").notNull().default("member"),
    token: text("token").notNull().unique(),
    invitedBy: integer("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Critical: find invite by email. Token already unique-indexed.
  (t) => [index("invitations_email_idx").on(t.email)]
);

export type Invitation = InferSelectModel<typeof invitations>;
export type NewInvitation = InferInsertModel<typeof invitations>;
