import { pgTable, serial, varchar, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { systemRoleEnum } from "./enums.js";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    // Separate column; app generates from name on create (design-sprint), dedupes with -2/-3.
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: systemRoleEnum("role").notNull().default("user"),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    // Soft delete
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  // email.unique() already indexed; role needs it for role filters,
  // name for admin Users search (name + email contains ?q=)
  (t) => [index("users_role_idx").on(t.role), index("users_name_idx").on(t.name)]
);

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;