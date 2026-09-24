import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { users } from "./users.js";

// Ephemeral: hard delete once used/expired. Token unique covers lookup.
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PasswordResetToken = InferSelectModel<typeof passwordResetTokens>;
export type NewPasswordResetToken = InferInsertModel<typeof passwordResetTokens>;
