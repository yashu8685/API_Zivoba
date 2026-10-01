import type { Context } from "hono";

import type { AuthVariables } from "../middleware/auth.middleware.js";

import {
    createCard as createCardService,
    getCard as getCardService,
    updateCard as updateCardService,
    deleteCard as deleteCardService,
} from "../service/card.service.js";

export const createCard = async (
    c: Context<{ Variables: AuthVariables }>
) => {
    try {
        const authUser = c.get("user");

        const body = await c.req.json();

        const listId = Number(body.listId);
        const title = body.title?.toString().trim();

        const description =
            body.description !== undefined &&
            body.description !== null
                ? body.description.toString()
                : undefined;

        const priority =
            body.priority !== undefined
                ? body.priority.toString()
                : undefined;

        const dueDate =
            body.dueDate !== undefined &&
            body.dueDate !== null &&
            body.dueDate !== ""
                ? body.dueDate.toString()
                : null;

        const assigneeId =
            body.assigneeId !== undefined &&
            body.assigneeId !== null &&
            body.assigneeId !== ""
                ? Number(body.assigneeId)
                : null;

        if (!Number.isInteger(listId) || listId <= 0) {
            return c.json(
                {
                    success: false,
                    message: "Invalid list ID",
                },
                400
            );
        }

        if (!title) {
            return c.json(
                {
                    success: false,
                    message: "Card title is required",
                },
                400
            );
        }

        if (
            priority !== undefined &&
            !["low", "medium", "high"].includes(priority)
        ) {
            return c.json(
                {
                    success: false,
                    message: "Invalid card priority",
                },
                400
            );
        }

        if (
            assigneeId !== null &&
            (!Number.isInteger(assigneeId) || assigneeId <= 0)
        ) {
            return c.json(
                {
                    success: false,
                    message: "Invalid assignee ID",
                },
                400
            );
        }

        const result = await createCardService(
            authUser.userId,
            {
                listId,
                title,
                description,
                priority: priority as
                    | "low"
                    | "medium"
                    | "high"
                    | undefined,
                dueDate,
                assigneeId,
            }
        );

        if (!result.success) {
            if (result.reason === "LIST_NOT_FOUND") {
                return c.json(
                    {
                        success: false,
                        message:
                            "List not found or you do not have access",
                    },
                    404
                );
            }

            if (
                result.reason ===
                "ASSIGNEE_NOT_BOARD_MEMBER"
            ) {
                return c.json(
                    {
                        success: false,
                        message:
                            "Selected assignee is not a member of this board",
                    },
                    400
                );
            }
        }

        return c.json(
            {
                success: true,
                message: "Card created successfully",
                card: result.card,
            },
            201
        );
    } catch (error) {
        console.error("Create card error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to create card",
            },
            500
        );
    }
};

export const getCard = async (
    c: Context<{ Variables: AuthVariables }>
) => {
    try {
        const authUser = c.get("user");

        const cardId = Number(
            c.req.param("cardId")
        );

        if (!Number.isInteger(cardId) || cardId <= 0) {
            return c.json(
                {
                    success: false,
                    message: "Invalid card ID",
                },
                400
            );
        }

        const result = await getCardService(
            cardId,
            authUser.userId
        );

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    message:
                        "Card not found or you do not have access",
                },
                404
            );
        }

        return c.json({
            success: true,
            card: result.card,
        });
    } catch (error) {
        console.error("Get card error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to get card",
            },
            500
        );
    }
};

export const updateCard = async (
    c: Context<{ Variables: AuthVariables }>
) => {
    try {
        const authUser = c.get("user");

        const cardId = Number(
            c.req.param("cardId")
        );

        if (!Number.isInteger(cardId) || cardId <= 0) {
            return c.json(
                {
                    success: false,
                    message: "Invalid card ID",
                },
                400
            );
        }

        const body = await c.req.json();

        // Move card to another list
        const listId =
            body.listId !== undefined &&
            body.listId !== null &&
            body.listId !== ""
                ? Number(body.listId)
                : undefined;

        // Card title
        const title =
            body.title !== undefined
                ? body.title?.toString().trim()
                : undefined;

        // Card description
        const description =
            body.description !== undefined &&
            body.description !== null
                ? body.description.toString()
                : body.description === null
                    ? null
                    : undefined;

        // Card priority
        const priority =
            body.priority !== undefined
                ? body.priority.toString()
                : undefined;

        // Due date
        const dueDate =
            body.dueDate !== undefined &&
            body.dueDate !== null &&
            body.dueDate !== ""
                ? body.dueDate.toString()
                : body.dueDate === null
                    ? null
                    : undefined;

        // Assignee
        const assigneeId =
            body.assigneeId !== undefined &&
            body.assigneeId !== null &&
            body.assigneeId !== ""
                ? Number(body.assigneeId)
                : body.assigneeId === null
                    ? null
                    : undefined;

        // Validate list ID
        if (
            listId !== undefined &&
            (!Number.isInteger(listId) || listId <= 0)
        ) {
            return c.json(
                {
                    success: false,
                    message: "Invalid list ID",
                },
                400
            );
        }

        // Validate title
        if (title !== undefined && !title) {
            return c.json(
                {
                    success: false,
                    message: "Card title cannot be empty",
                },
                400
            );
        }

        // Validate priority
        if (
            priority !== undefined &&
            !["low", "medium", "high"].includes(priority)
        ) {
            return c.json(
                {
                    success: false,
                    message: "Invalid card priority",
                },
                400
            );
        }

        // Validate assignee ID
        if (
            assigneeId !== undefined &&
            assigneeId !== null &&
            (!Number.isInteger(assigneeId) || assigneeId <= 0)
        ) {
            return c.json(
                {
                    success: false,
                    message: "Invalid assignee ID",
                },
                400
            );
        }

        const result = await updateCardService(
            cardId,
            authUser.userId,
            {
                listId,
                title,
                description,
                priority: priority as
                    | "low"
                    | "medium"
                    | "high"
                    | undefined,
                dueDate,
                assigneeId,
            }
        );

        if (!result.success) {
            if (result.reason === "LIST_NOT_FOUND") {
                return c.json(
                    {
                        success: false,
                        message:
                            "Destination list not found or you do not have access",
                    },
                    404
                );
            }

            if (
                result.reason ===
                "ASSIGNEE_NOT_BOARD_MEMBER"
            ) {
                return c.json(
                    {
                        success: false,
                        message:
                            "Selected assignee is not a member of this board",
                    },
                    400
                );
            }

            return c.json(
                {
                    success: false,
                    message:
                        "Card not found or you do not have access",
                },
                404
            );
        }

        return c.json({
            success: true,
            message: "Card updated successfully",
            card: result.card,
        });
    } catch (error) {
        console.error("Update card error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to update card",
            },
            500
        );
    }
};

export const deleteCard = async (
    c: Context<{ Variables: AuthVariables }>
) => {
    try {
        const authUser = c.get("user");

        const cardId = Number(
            c.req.param("cardId")
        );

        if (!Number.isInteger(cardId) || cardId <= 0) {
            return c.json(
                {
                    success: false,
                    message: "Invalid card ID",
                },
                400
            );
        }

        const result = await deleteCardService(
            cardId,
            authUser.userId
        );

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    message:
                        "Card not found or you do not have access",
                },
                404
            );
        }

        return c.json({
            success: true,
            message: "Card deleted successfully",
            card: result.card,
        });
    } catch (error) {
        console.error("Delete card error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to delete card",
            },
            500
        );
    }
};