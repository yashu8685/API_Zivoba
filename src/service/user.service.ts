import { and, eq, isNull } from "drizzle-orm";
import argon2 from "argon2";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { boards } from "../db/schema/boards.js";
import { boardMembers } from "../db/schema/board_members.js";
import { lists } from "../db/schema/lists.js";
import { cards } from "../db/schema/cards.js";

export const getCurrentUser = async (userId: number) => {
    const result = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            avatarUrl: users.avatarUrl,
            isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (result.length === 0) {
        return null;
    }

    return result[0];
};

export const getUserBoards = async (userId: number) => {
    // ============================================================
    // 1. GET BOARDS THE USER IS A MEMBER OF
    // ============================================================

    const userBoards = await db
        .select({
            id: boards.id,
            name: boards.name,
            slug: boards.slug,
            description: boards.description,
            workspaceId: boards.workspaceId,
        })
        .from(boardMembers)
        .innerJoin(
            boards,
            eq(boardMembers.boardId, boards.id)
        )
        .where(
            and(
                eq(boardMembers.userId, userId),
                isNull(boards.deletedAt)
            )
        );

    // ============================================================
    // 2. CALCULATE BOARD COMPLETION
    // ============================================================

    const boardsWithCompletion = [];

    for (const board of userBoards) {
        // --------------------------------------------------------
        // Find the completed list for this board
        // --------------------------------------------------------

        const completedList = await db
            .select({
                id: lists.id,
            })
            .from(lists)
            .where(
                and(
                    eq(lists.boardId, board.id),
                    eq(lists.isCompleted, true),
                    isNull(lists.deletedAt)
                )
            )
            .limit(1);

        // --------------------------------------------------------
        // Get all active cards belonging to this board
        // --------------------------------------------------------

        const boardCards = await db
            .select({
                id: cards.id,
                listId: cards.listId,
            })
            .from(cards)
            .innerJoin(
                lists,
                eq(cards.listId, lists.id)
            )
            .where(
                and(
                    eq(lists.boardId, board.id),
                    isNull(cards.deletedAt),
                    isNull(lists.deletedAt)
                )
            );

        // --------------------------------------------------------
        // Determine whether the whole board is completed
        // --------------------------------------------------------

        let isCompleted = false;

        if (
            completedList.length > 0 &&
            boardCards.length > 0
        ) {
            const completedListId = completedList[0].id;

            const allCardsCompleted = boardCards.every(
                (card) => card.listId === completedListId
            );

            isCompleted = allCardsCompleted;
        }

        // --------------------------------------------------------
        // Add calculated completion status
        // --------------------------------------------------------

        boardsWithCompletion.push({
            ...board,
            isCompleted,
        });
    }

    return boardsWithCompletion;
};

export const updateCurrentUser = async (
    userId: number,
    updates: {
        name?: string;
        email?: string;
    }
) => {
    // Check whether the current user exists
    const currentUser = await db
        .select({
            id: users.id,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (currentUser.length === 0) {
        return {
            user: null,
            reason: "USER_NOT_FOUND" as const,
        };
    }

    // Check whether the new email is already used by another user
    if (updates.email) {
        const existingUser = await db
            .select({
                id: users.id,
            })
            .from(users)
            .where(eq(users.email, updates.email))
            .limit(1);

        if (
            existingUser.length > 0 &&
            existingUser[0].id !== userId
        ) {
            return {
                user: null,
                reason: "EMAIL_ALREADY_EXISTS" as const,
            };
        }
    }

    // Update only the fields provided
    const updateData: {
        name?: string;
        email?: string;
        updatedAt: Date;
    } = {
        updatedAt: new Date(),
    };

    if (updates.name !== undefined) {
        updateData.name = updates.name;
    }

    if (updates.email !== undefined) {
        updateData.email = updates.email;
    }

    await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId));

    // Return the updated user
    const updatedUser = await getCurrentUser(userId);

    return {
        user: updatedUser,
        reason: null,
    };
};
export const changeUserPassword = async (
    userId: number,
    currentPassword: string,
    newPassword: string
) => {
    // Get the user's current password hash
    const result = await db
        .select({
            id: users.id,
            passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (result.length === 0) {
        return {
            reason: "USER_NOT_FOUND" as const,
        };
    }

    const user = result[0];

    // Verify the current password
    const passwordValid = await argon2.verify(
        user.passwordHash,
        currentPassword
    );

    if (!passwordValid) {
        return {
            reason: "INVALID_CURRENT_PASSWORD" as const,
        };
    }

    // Hash the new password
    const newPasswordHash = await argon2.hash(newPassword);

    // Update the password
    await db
        .update(users)
        .set({
            passwordHash: newPasswordHash,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

    return {
        reason: null,
    };
};