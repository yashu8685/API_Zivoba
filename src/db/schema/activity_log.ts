import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { users } from "./users.js";
import { workspaces } from "./workspaces.js";
import { boards } from "./boards.js";
import { cards } from "./cards.js";

// Dashboard Recent activity + boardActive sort — hard delete (log retention handled by cleanup job)
export const activityLog = pgTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
    workspaceId: integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    boardId: integer("board_id").references(() => boards.id, { onDelete: "cascade" }),
    cardId: integer("card_id").references(() => cards.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Critical: dashboard feed per board.
  (t) => [index("activity_log_board_id_idx").on(t.boardId)]
);

export type ActivityEntry = InferSelectModel<typeof activityLog>;
export type NewActivityEntry = InferInsertModel<typeof activityLog>;
