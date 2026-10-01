import {
    pgTable,
    serial,
    integer,
    text,
    timestamp,
    index,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const feedback = pgTable(
    "feedback",
    {
        id: serial("id").primaryKey(),

        userId: integer("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        message: text("message").notNull(),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("feedback_user_id_idx").on(table.userId),
        index("feedback_created_at_idx").on(table.createdAt),
    ]
);