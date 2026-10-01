import { and, asc, eq, isNull } from "drizzle-orm";
import { users } from "../db/schema/users.js";
import { db } from "../db/index.js";
import { lists } from "../db/schema/lists.js";
import { cards } from "../db/schema/cards.js";
import { boardMembers } from "../db/schema/board_members.js";

export const getListCards = async (
    listId: number,
    userId: number
) => {
    const listCards = await db
        .select({
            id: cards.id,
            listId: cards.listId,
            title: cards.title,
            slug: cards.slug,
            description: cards.description,
            priority: cards.priority,
            dueDate: cards.dueDate,

            // Assignment
            assigneeId: cards.assigneeId,
            assigneeName: users.name,
            assigneeEmail: users.email,

            position: cards.position,
            createdBy: cards.createdBy,
            createdAt: cards.createdAt,
            updatedAt: cards.updatedAt,
        })
        .from(cards)
        .innerJoin(
            lists,
            eq(cards.listId, lists.id)
        )
        .innerJoin(
            boardMembers,
            eq(lists.boardId, boardMembers.boardId)
        )
        .leftJoin(
            users,
            eq(cards.assigneeId, users.id)
        )
        .where(
            and(
                eq(cards.listId, listId),
                eq(boardMembers.userId, userId),
                isNull(cards.deletedAt),
                isNull(lists.deletedAt)
            )
        )
        .orderBy(asc(cards.position));

    return listCards;
};
export const createList = async (
    userId: number,
    input: {
        boardId: number;
        title: string;
        position?: number;
    }
) => {
    // Check whether the user is a member of the board
    const membership = await db
        .select({
            boardId: boardMembers.boardId,
        })
        .from(boardMembers)
        .where(
            and(
                eq(boardMembers.boardId, input.boardId),
                eq(boardMembers.userId, userId)
            )
        )
        .limit(1);

    if (membership.length === 0) {
        return {
            success: false as const,
            reason: "BOARD_ACCESS_DENIED" as const,
        };
    }

    const slug = input.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 150);

    const [newList] = await db
        .insert(lists)
        .values({
            boardId: input.boardId,
            title: input.title.trim(),
            slug,
            position: input.position ?? 0,
        })
        .returning({
            id: lists.id,
            boardId: lists.boardId,
            title: lists.title,
            slug: lists.slug,
            position: lists.position,
            createdAt: lists.createdAt,
            updatedAt: lists.updatedAt,
        });

    return {
        success: true as const,
        list: newList,
    };
};
export const updateList = async (
    listId: number,
    userId: number,
    input: {
        title?: string;
        position?: number;
    }
) => {
    const existingList = await db
        .select({
            id: lists.id,
            boardId: lists.boardId,
        })
        .from(lists)
        .innerJoin(
            boardMembers,
            eq(lists.boardId, boardMembers.boardId)
        )
        .where(
            and(
                eq(lists.id, listId),
                eq(boardMembers.userId, userId),
                isNull(lists.deletedAt)
            )
        )
        .limit(1);

    if (existingList.length === 0) {
        return {
            success: false as const,
            reason: "LIST_NOT_FOUND" as const,
        };
    }

    const updates: {
        title?: string;
        slug?: string;
        position?: number;
    } = {};

    if (input.title !== undefined) {
        const title = input.title.trim();

        if (!title) {
            return {
                success: false as const,
                reason: "INVALID_TITLE" as const,
            };
        }

        const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 150);

        updates.title = title;
        updates.slug = slug;
    }

    if (input.position !== undefined) {
        updates.position = input.position;
    }

    if (Object.keys(updates).length === 0) {
        return {
            success: false as const,
            reason: "NO_UPDATES" as const,
        };
    }

    const [updatedList] = await db
        .update(lists)
        .set(updates)
        .where(eq(lists.id, listId))
        .returning({
            id: lists.id,
            boardId: lists.boardId,
            title: lists.title,
            slug: lists.slug,
            position: lists.position,
            createdAt: lists.createdAt,
            updatedAt: lists.updatedAt,
        });

    return {
        success: true as const,
        list: updatedList,
    };
};
export const deleteList = async (
    listId: number,
    userId: number
) => {
    const existingList = await db
        .select({
            id: lists.id,
            boardId: lists.boardId,
        })
        .from(lists)
        .innerJoin(
            boardMembers,
            eq(lists.boardId, boardMembers.boardId)
        )
        .where(
            and(
                eq(lists.id, listId),
                eq(boardMembers.userId, userId),
                isNull(lists.deletedAt)
            )
        )
        .limit(1);

    if (existingList.length === 0) {
        return {
            success: false as const,
            reason: "LIST_NOT_FOUND" as const,
        };
    }

    await db
        .update(lists)
        .set({
            deletedAt: new Date(),
        })
        .where(eq(lists.id, listId));

    return {
        success: true as const,
    };
};
export const markListAsDone = async (
    listId: number,
    userId: number
) => {
    // 1. Check whether the list exists
    //    and whether the user has access to its board.
    const existingList = await db
        .select({
            id: lists.id,
            boardId: lists.boardId,
        })
        .from(lists)
        .innerJoin(
            boardMembers,
            eq(lists.boardId, boardMembers.boardId)
        )
        .where(
            and(
                eq(lists.id, listId),
                eq(boardMembers.userId, userId),
                isNull(lists.deletedAt)
            )
        )
        .limit(1);

    if (existingList.length === 0) {
        return {
            success: false as const,
            reason: "LIST_NOT_FOUND" as const,
        };
    }

    const boardId = existingList[0].boardId;

    // 2. Make every other list in this board normal.
    await db
        .update(lists)
        .set({
            isCompleted: false,
        })
        .where(
            and(
                eq(lists.boardId, boardId),
                isNull(lists.deletedAt)
            )
        );

    // 3. Mark the selected list as completed.
    const [updatedList] = await db
        .update(lists)
        .set({
            isCompleted: true,
        })
        .where(eq(lists.id, listId))
        .returning({
            id: lists.id,
            boardId: lists.boardId,
            title: lists.title,
            slug: lists.slug,
            position: lists.position,
            isCompleted: lists.isCompleted,
            createdAt: lists.createdAt,
            updatedAt: lists.updatedAt,
        });

    return {
        success: true as const,
        list: updatedList,
    };
};