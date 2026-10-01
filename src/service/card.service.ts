import { and, desc, eq, isNull } from "drizzle-orm";

import { users } from "../db/schema/users.js";
import { db } from "../db/index.js";
import { cards } from "../db/schema/cards.js";
import { lists } from "../db/schema/lists.js";
import { boardMembers } from "../db/schema/board_members.js";

export const createCard = async (
    userId: number,
    input: {
        listId: number;
        title: string;
        description?: string;
        priority?: "low" | "medium" | "high";
        dueDate?: string | null;
        assigneeId?: number | null;
    }
) => {
    // Check whether the user has access to the list
    const existingList = await db
        .select({
            listId: lists.id,
            boardId: lists.boardId,
        })
        .from(lists)
        .innerJoin(
            boardMembers,
            eq(lists.boardId, boardMembers.boardId)
        )
        .where(
            and(
                eq(lists.id, input.listId),
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

    // Validate assignee
    // The selected user must be a member of the same board.
    if (
        input.assigneeId !== undefined &&
        input.assigneeId !== null
    ) {
        const existingAssignee = await db
            .select({
                userId: boardMembers.userId,
            })
            .from(boardMembers)
            .where(
                and(
                    eq(
                        boardMembers.boardId,
                        existingList[0].boardId
                    ),
                    eq(
                        boardMembers.userId,
                        input.assigneeId
                    )
                )
            )
            .limit(1);

        if (existingAssignee.length === 0) {
            return {
                success: false as const,
                reason: "ASSIGNEE_NOT_BOARD_MEMBER" as const,
            };
        }
    }

    // Generate slug from title
    const slug = input.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 150);

    // Get the current last position in this list
    const lastCard = await db
        .select({
            position: cards.position,
        })
        .from(cards)
        .where(
            and(
                eq(cards.listId, input.listId),
                isNull(cards.deletedAt)
            )
        )
        .orderBy(desc(cards.position))
        .limit(1);

    const position =
        lastCard.length > 0
            ? lastCard[0].position + 1
            : 0;

    // Create card
    const [newCard] = await db
        .insert(cards)
        .values({
            listId: input.listId,
            title: input.title.trim(),
            slug,
            description:
                input.description?.trim() || null,
            priority: input.priority ?? "medium",
            dueDate: input.dueDate || null,
            assigneeId: input.assigneeId ?? null,
            position,
            createdBy: userId,
        })
        .returning({
            id: cards.id,
            listId: cards.listId,
            title: cards.title,
            slug: cards.slug,
            description: cards.description,
            priority: cards.priority,
            dueDate: cards.dueDate,
            assigneeId: cards.assigneeId,
            position: cards.position,
            createdBy: cards.createdBy,
            createdAt: cards.createdAt,
            updatedAt: cards.updatedAt,
        });

    return {
        success: true as const,
        card: newCard,
    };
};

export const getCard = async (
    cardId: number,
    userId: number
) => {
    const result = await db
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
                eq(cards.id, cardId),
                eq(boardMembers.userId, userId),
                isNull(cards.deletedAt),
                isNull(lists.deletedAt)
            )
        )
        .limit(1);

    if (result.length === 0) {
        return {
            success: false as const,
            reason: "CARD_NOT_FOUND" as const,
        };
    }

    return {
        success: true as const,
        card: result[0],
    };
};

export const updateCard = async (
    cardId: number,
    userId: number,
    input: {
        listId?: number;
        title?: string;
        description?: string | null;
        priority?: "low" | "medium" | "high";
        dueDate?: string | null;
        assigneeId?: number | null;
    }
) => {
    // Check that the card exists
    // and the logged-in user has access to its board.
    const existingCard = await db
        .select({
            id: cards.id,
            boardId: lists.boardId,
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
        .where(
            and(
                eq(cards.id, cardId),
                eq(boardMembers.userId, userId),
                isNull(cards.deletedAt),
                isNull(lists.deletedAt)
            )
        )
        .limit(1);

    if (existingCard.length === 0) {
        return {
            success: false as const,
            reason: "CARD_NOT_FOUND" as const,
        };
    }

    // Validate destination list when moving the card.
    // The destination list must belong to the same board.
    if (input.listId !== undefined) {
        const destinationList = await db
            .select({
                id: lists.id,
                boardId: lists.boardId,
            })
            .from(lists)
            .where(
                and(
                    eq(lists.id, input.listId),
                    eq(
                        lists.boardId,
                        existingCard[0].boardId
                    ),
                    isNull(lists.deletedAt)
                )
            )
            .limit(1);

        if (destinationList.length === 0) {
            return {
                success: false as const,
                reason: "LIST_NOT_FOUND" as const,
            };
        }
    }

    // Validate assignee if one was provided.
    // The assignee must be a member of the same board.
    if (
        input.assigneeId !== undefined &&
        input.assigneeId !== null
    ) {
        const existingAssignee = await db
            .select({
                userId: boardMembers.userId,
            })
            .from(boardMembers)
            .where(
                and(
                    eq(
                        boardMembers.boardId,
                        existingCard[0].boardId
                    ),
                    eq(
                        boardMembers.userId,
                        input.assigneeId
                    )
                )
            )
            .limit(1);

        if (existingAssignee.length === 0) {
            return {
                success: false as const,
                reason: "ASSIGNEE_NOT_BOARD_MEMBER" as const,
            };
        }
    }

    const updates: {
        listId?: number;
        title?: string;
        slug?: string;
        description?: string | null;
        priority?: "low" | "medium" | "high";
        dueDate?: string | null;
        assigneeId?: number | null;
    } = {};

    // Move card to another list
    if (input.listId !== undefined) {
        updates.listId = input.listId;
    }

    // Update title
    if (input.title !== undefined) {
        const title = input.title.trim();

        if (title) {
            updates.title = title;

            updates.slug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .slice(0, 150);
        }
    }

    // Update description
    if (input.description !== undefined) {
        updates.description =
            input.description?.trim() || null;
    }

    // Update priority
    if (input.priority !== undefined) {
        updates.priority = input.priority;
    }

    // Update due date
    if (input.dueDate !== undefined) {
        updates.dueDate = input.dueDate || null;
    }

    // Update assignee
    if (input.assigneeId !== undefined) {
        updates.assigneeId = input.assigneeId;
    }

    const [updatedCard] = await db
        .update(cards)
        .set(updates)
        .where(eq(cards.id, cardId))
        .returning({
            id: cards.id,
            listId: cards.listId,
            title: cards.title,
            slug: cards.slug,
            description: cards.description,
            priority: cards.priority,
            dueDate: cards.dueDate,
            assigneeId: cards.assigneeId,
            position: cards.position,
            createdBy: cards.createdBy,
            createdAt: cards.createdAt,
            updatedAt: cards.updatedAt,
        });

    return {
        success: true as const,
        card: updatedCard,
    };
};

export const deleteCard = async (
    cardId: number,
    userId: number
) => {
    // Check whether the user has access to this card
    const existingCard = await db
        .select({
            id: cards.id,
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
        .where(
            and(
                eq(cards.id, cardId),
                eq(boardMembers.userId, userId),
                isNull(cards.deletedAt),
                isNull(lists.deletedAt)
            )
        )
        .limit(1);

    if (existingCard.length === 0) {
        return {
            success: false as const,
            reason: "CARD_NOT_FOUND" as const,
        };
    }

    // Soft delete
    const [deletedCard] = await db
        .update(cards)
        .set({
            deletedAt: new Date(),
        })
        .where(eq(cards.id, cardId))
        .returning({
            id: cards.id,
        });

    return {
        success: true as const,
        card: deletedCard,
    };
};