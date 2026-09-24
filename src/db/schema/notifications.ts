import { pgTable, serial, integer, varchar, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { users } from "./users.js";
import { notificationTypeEnum } from "./enums.js";

// Ephemeral: hard delete (no deletedAt)
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Critical: unread badge + my notifications. Covers WHERE userId too.
  (t) => [index("notifications_user_read_idx").on(t.userId, t.isRead)]
);

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;
