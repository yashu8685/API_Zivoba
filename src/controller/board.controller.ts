import type { Context } from "hono";

import {
    authMiddleware,
    AuthVariables,
} from "../middleware/auth.middleware.js";

import { getBoardLists ,getBoardMembers} from "../service/board.service.js";

export const getLists = async (
    c: Context<{ Variables: AuthVariables }>
) => {
    try {
        const authUser = c.get("user");

        const boardId = Number(c.req.param("boardId"));

        if (!Number.isInteger(boardId) || boardId <= 0) {
            return c.json(
                {
                    success: false,
                    message: "Invalid board ID",
                },
                400
            );
        }

        const boardLists = await getBoardLists(
            boardId,
            authUser.userId
        );

        return c.json({
            success: true,
            lists: boardLists,
        });
    } catch (error) {
        console.error("Get board lists error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to get board lists",
            },
            500
        );
    }
};
// ============================================================
// GET BOARD MEMBERS
// ============================================================

export const getMembers = async (
    c: Context<{ Variables: AuthVariables }>
) => {
    try {
        const authUser = c.get("user");

        const boardId = Number(c.req.param("boardId"));

        if (!Number.isInteger(boardId) || boardId <= 0) {
            return c.json(
                {
                    success: false,
                    message: "Invalid board ID",
                },
                400
            );
        }

        const members = await getBoardMembers(
            boardId,
            authUser.userId
        );

        return c.json({
            success: true,
            members,
        });
    } catch (error) {
        console.error("Get board members error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to get board members",
            },
            500
        );
    }
};