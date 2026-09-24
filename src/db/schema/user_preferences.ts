import { pgTable, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { users } from "./users.js";

// Profile → Notification preferences (Profile.tsx: mentions/assignments/comments)
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  mentions: boolean("mentions").notNull().default(true),
  assignments: boolean("assignments").notNull().default(true),
  comments: boolean("comments").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UserPreferences = InferSelectModel<typeof userPreferences>;
export type NewUserPreferences = InferInsertModel<typeof userPreferences>;
