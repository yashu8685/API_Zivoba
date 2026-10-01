import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "../db/index.js";
import { lists } from "../db/schema/lists.js";
import { boardMembers } from "../db/schema/board_members.js";
import { users } from "../db/schema/users.js";

export const getBoardLists = async (
    boardId: number,
    userId: number
) => {
    const boardLists = await db
        .select({
            id: lists.id,
            boardId: lists.boardId,
            title: lists.title,
            slug: lists.slug,
            position: lists.position,
            isCompleted: lists.isCompleted,

            createdAt: lists.createdAt,
            updatedAt: lists.updatedAt,
        })
        .from(lists)
        .innerJoin(
            boardMembers,
            eq(lists.boardId, boardMembers.boardId)
        )
        .where(
            and(
                eq(lists.boardId, boardId),
                eq(boardMembers.userId, userId),
                isNull(lists.deletedAt)
            )
        )
        .orderBy(asc(lists.position));

    return boardLists;
};


// ============================================================
// GET BOARD MEMBERS
// ============================================================

export const getBoardMembers = async (
    boardId: number,
    userId: number
) => {
    const boardMembersList = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
            role: boardMembers.role,
        })
        .from(boardMembers)
        .innerJoin(
            users,
            eq(boardMembers.userId, users.id)
        )
        .where(
            and(
                eq(boardMembers.boardId, boardId),
                eq(users.isActive, true),
                isNull(users.deletedAt)
            )
        );

    return boardMembersList;
};