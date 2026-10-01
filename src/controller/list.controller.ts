import type { Context } from "hono";

import type { AuthVariables } from "../middleware/auth.middleware.js";

import {
    getListCards,
    createList as createListService,
    updateList as updateListService,
    deleteList as deleteListService,
    markListAsDone as markListAsDoneService,
} from "../service/list.service.js";
export const getCards = async (
    c: Context<{ Variables: AuthVariables }>
) => {
    try {
        const authUser = c.get("user");

        const listId = Number(c.req.param("listId"));

        if (!Number.isInteger(listId) || listId <= 0) {
            return c.json(
                {
                    success: false,
                    message: "Invalid list ID",
                },
                400
            );
        }

        const listCards = await getListCards(
            listId,
            authUser.userId
        );

        return c.json({
            success: true,
            cards: listCards,
        });
    } catch (error) {
        console.error("Get list cards error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to get list cards",
            },
            500
        );
    }
};
export const createList = async (
    c: Context<{ Variables: AuthVariables }>
) => {
    try {
        const authUser = c.get("user");

        const body = await c.req.json();

        const boardId = Number(body.boardId);
        const title = body.title?.toString().trim();
        const position =
            body.position !== undefined
                ? Number(body.position)
                : undefined;

        if (
            !Number.isInteger(boardId) ||
            boardId <= 0
        ) {
            return c.json(
                {
                    success: false,
                    message: "Invalid board ID",
                },
                400
            );
        }

        if (!title) {
            return c.json(
                {
                    success: false,
                    message: "List title is required",
                },
                400
            );
        }

        if (
            position !== undefined &&
            (!Number.isInteger(position) || position < 0)
        ) {
            return c.json(
                {
                    success: false,
                    message: "Invalid list position",
                },
                400
            );
        }

        const result = await createListService(
            authUser.userId,
            {
                boardId,
                title,
                position,
            }
        );

        if (
            !result.success &&
            result.reason === "BOARD_ACCESS_DENIED"
        ) {
            return c.json(
                {
                    success: false,
                    message: "You are not a member of this board",
                },
                403
            );
        }

        return c.json(
            {
                success: true,
                message: "List created successfully",
                list: result.list,
            },
            201
        );
    } catch (error) {
        console.error("Create list error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to create list",
            },
            500
        );
    }
};
export const updateList = async (
    c: Context<{ Variables: AuthVariables }>
) => {
    try {
        const authUser = c.get("user");

        const listId = Number(c.req.param("listId"));

        if (!Number.isInteger(listId) || listId <= 0) {
            return c.json(
                {
                    success: false,
                    message: "Invalid list ID",
                },
                400
            );
        }

        const body = await c.req.json();

        const title =
            body.title !== undefined
                ? body.title.toString()
                : undefined;

        const position =
            body.position !== undefined
                ? Number(body.position)
                : undefined;

        if (
            position !== undefined &&
            (!Number.isInteger(position) || position < 0)
        ) {
            return c.json(
                {
                    success: false,
                    message: "Invalid list position",
                },
                400
            );
        }

        const result = await updateListService(
            listId,
            authUser.userId,
            {
                title,
                position,
            }
        );

        if (!result.success) {
            if (result.reason === "LIST_NOT_FOUND") {
                return c.json(
                    {
                        success: false,
                        message: "List not found or you do not have access",
                    },
                    404
                );
            }

            if (result.reason === "INVALID_TITLE") {
                return c.json(
                    {
                        success: false,
                        message: "List title cannot be empty",
                    },
                    400
                );
            }

            if (result.reason === "NO_UPDATES") {
                return c.json(
                    {
                        success: false,
                        message: "No updates provided",
                    },
                    400
                );
            }
        }

        return c.json({
            success: true,
            message: "List updated successfully",
            list: result.list,
        });
    } catch (error) {
        console.error("Update list error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to update list",
            },
            500
        );
    }
};
export const deleteList = async (
    c: Context<{ Variables: AuthVariables }>
) => {
    try {
        const authUser = c.get("user");

        const listId = Number(c.req.param("listId"));

        if (!Number.isInteger(listId) || listId <= 0) {
            return c.json(
                {
                    success: false,
                    message: "Invalid list ID",
                },
                400
            );
        }

        const result = await deleteListService(
            listId,
            authUser.userId
        );

        if (!result.success) {
            if (result.reason === "LIST_NOT_FOUND") {
                return c.json(
                    {
                        success: false,
                        message: "List not found or you do not have access",
                    },
                    404
                );
            }
        }

        return c.json({
            success: true,
            message: "List deleted successfully",
        });
    } catch (error) {
        console.error("Delete list error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to delete list",
            },
            500
        );
    }
};
export const markListDone = async (
    c: Context<{ Variables: AuthVariables }>
) => {
    try {
        const authUser = c.get("user");

        const listId = Number(c.req.param("listId"));

        if (!Number.isInteger(listId) || listId <= 0) {
            return c.json(
                {
                    success: false,
                    message: "Invalid list ID",
                },
                400
            );
        }

        const result = await markListAsDoneService(
            listId,
            authUser.userId
        );

        if (!result.success) {
            if (result.reason === "LIST_NOT_FOUND") {
                return c.json(
                    {
                        success: false,
                        message: "List not found or you do not have access",
                    },
                    404
                );
            }
        }

        return c.json({
            success: true,
            message: "List marked as done successfully",
            list: result.list,
        });
    } catch (error) {
        console.error("Mark list as done error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to mark list as done",
            },
            500
        );
    }
};