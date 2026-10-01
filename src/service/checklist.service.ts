import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "../db/index.js";
import { checklists } from "../db/schema/checklists.js";
import { cards } from "../db/schema/cards.js";
import { lists } from "../db/schema/lists.js";
import { boardMembers } from "../db/schema/board_members.js";


// ============================================================
// GET ALL CHECKLIST ITEMS FOR A CARD
// ============================================================

export const getCardChecklists = async (
    cardId: number,
    userId: number
) => {
    // Check whether the user has access to the card
    const existingCard = await db
        .select({
            cardId: cards.id,
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

    const cardChecklists = await db
        .select({
            id: checklists.id,
            cardId: checklists.cardId,
            title: checklists.title,
            slug: checklists.slug,
            position: checklists.position,
            isCompleted: checklists.isCompleted,
            createdAt: checklists.createdAt,
            updatedAt: checklists.updatedAt,
        })
        .from(checklists)
        .where(
            eq(checklists.cardId, cardId)
        )
        .orderBy(asc(checklists.position));

    return {
        success: true as const,
        checklists: cardChecklists,
    };
};


// ============================================================
// CREATE CHECKLIST ITEM
// ============================================================

export const createChecklist = async (
    cardId: number,
    userId: number,
    input: {
        title: string;
    }
) => {
    // Check whether the user has access to the card
    const existingCard = await db
        .select({
            cardId: cards.id,
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

    const title = input.title.trim();

    if (!title) {
        return {
            success: false as const,
            reason: "TITLE_REQUIRED" as const,
        };
    }

    // Get the current last position
    const lastChecklist = await db
        .select({
            position: checklists.position,
        })
        .from(checklists)
        .where(
            eq(checklists.cardId, cardId)
        )
        .orderBy(desc(checklists.position))
        .limit(1);

    const position =
        lastChecklist.length > 0
            ? lastChecklist[0].position + 1
            : 0;

    // Generate slug from title
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 150);

    const [newChecklist] = await db
        .insert(checklists)
        .values({
            cardId,
            title,
            slug,
            position,
            isCompleted: false,
        })
        .returning({
            id: checklists.id,
            cardId: checklists.cardId,
            title: checklists.title,
            slug: checklists.slug,
            position: checklists.position,
            isCompleted: checklists.isCompleted,
            createdAt: checklists.createdAt,
            updatedAt: checklists.updatedAt,
        });

    return {
        success: true as const,
        checklist: newChecklist,
    };
};


// ============================================================
// UPDATE CHECKLIST ITEM
// ============================================================

export const updateChecklist = async (
    checklistId: number,
    userId: number,
    input: {
        title?: string;
        isCompleted?: boolean;
    }
) => {
    // Find checklist and verify board access
    const existingChecklist = await db
        .select({
            id: checklists.id,
            cardId: checklists.cardId,
            boardId: lists.boardId,
        })
        .from(checklists)
        .innerJoin(
            cards,
            eq(checklists.cardId, cards.id)
        )
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
                eq(checklists.id, checklistId),
                eq(boardMembers.userId, userId),
                isNull(cards.deletedAt),
                isNull(lists.deletedAt)
            )
        )
        .limit(1);

    if (existingChecklist.length === 0) {
        return {
            success: false as const,
            reason: "CHECKLIST_NOT_FOUND" as const,
        };
    }

    const updates: {
        title?: string;
        slug?: string;
        isCompleted?: boolean;
    } = {};

    // Update title
    if (input.title !== undefined) {
        const title = input.title.trim();

        if (!title) {
            return {
                success: false as const,
                reason: "TITLE_REQUIRED" as const,
            };
        }

        updates.title = title;

        updates.slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 150);
    }

    // Update completion status
    if (input.isCompleted !== undefined) {
        updates.isCompleted = input.isCompleted;
    }

    const [updatedChecklist] = await db
        .update(checklists)
        .set(updates)
        .where(
            eq(checklists.id, checklistId)
        )
        .returning({
            id: checklists.id,
            cardId: checklists.cardId,
            title: checklists.title,
            slug: checklists.slug,
            position: checklists.position,
            isCompleted: checklists.isCompleted,
            createdAt: checklists.createdAt,
            updatedAt: checklists.updatedAt,
        });

    return {
        success: true as const,
        checklist: updatedChecklist,
    };
};


// ============================================================
// DELETE CHECKLIST ITEM
// ============================================================

export const deleteChecklist = async (
    checklistId: number,
    userId: number
) => {
    // Find checklist and verify board access
    const existingChecklist = await db
        .select({
            id: checklists.id,
        })
        .from(checklists)
        .innerJoin(
            cards,
            eq(checklists.cardId, cards.id)
        )
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
                eq(checklists.id, checklistId),
                eq(boardMembers.userId, userId),
                isNull(cards.deletedAt),
                isNull(lists.deletedAt)
            )
        )
        .limit(1);

    if (existingChecklist.length === 0) {
        return {
            success: false as const,
            reason: "CHECKLIST_NOT_FOUND" as const,
        };
    }

    const [deletedChecklist] = await db
        .delete(checklists)
        .where(
            eq(checklists.id, checklistId)
        )
        .returning({
            id: checklists.id,
        });

    return {
        success: true as const,
        checklist: deletedChecklist,
    };
};