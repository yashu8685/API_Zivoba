import { pgTable, serial, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { boards } from "./boards.js";
import { users } from "./users.js";
import { workspaceRoleEnum } from "./enums.js";

export const boardMembers = pgTable(
  "board_members",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Unique = is user on board? + userId = My Boards lookup.
  (t) => [
    index("board_members_user_id_idx").on(t.userId),
    uniqueIndex("board_members_board_user_unique").on(t.boardId, t.userId),
  ]
);

export type BoardMember = InferSelectModel<typeof boardMembers>;
export type NewBoardMember = InferInsertModel<typeof boardMembers>;
