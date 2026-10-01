import type { Context } from "hono";

import {
    getCardChecklists,
    createChecklist as createChecklistService,
    updateChecklist as updateChecklistService,
    deleteChecklist as deleteChecklistService,
} from "../service/checklist.service.js";

import type { AuthVariables } from "../middleware/auth.middleware.js";


// ============================================================
// GET CHECKLISTS FOR A CARD
// GET /cards/:cardId/checklists
// ============================================================

export const getChecklists = async (
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

        const result = await getCardChecklists(
            cardId,
            authUser.userId
        );

        if (!result.success) {
            if (result.reason === "CARD_NOT_FOUND") {
                return c.json(
                    {
                        success: false,
                        message:
                            "Card not found or you do not have access",
                    },
                    404
                );
            }
        }

        return c.json({
            success: true,
            checklists: result.checklists,
        });
    } catch (error) {
        console.error(
            "Get checklists error:",
            error
        );

        return c.json(
            {
                success: false,
                message: "Failed to get checklists",
            },
            500
        );
    }
};


// ============================================================
// CREATE CHECKLIST
// POST /cards/:cardId/checklists
// ============================================================

export const createChecklist = async (
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

        const result = await createChecklistService(
            cardId,
            authUser.userId,
            {
                title: body.title,
            }
        );

        if (!result.success) {
            if (result.reason === "CARD_NOT_FOUND") {
                return c.json(
                    {
                        success: false,
                        message:
                            "Card not found or you do not have access",
                    },
                    404
                );
            }

            if (result.reason === "TITLE_REQUIRED") {
                return c.json(
                    {
                        success: false,
                        message: "Checklist title is required",
                    },
                    400
                );
            }
        }

        return c.json(
            {
                success: true,
                message: "Checklist item created successfully",
                checklist: result.checklist,
            },
            201
        );
    } catch (error) {
        console.error(
            "Create checklist error:",
            error
        );

        return c.json(
            {
                success: false,
                message: "Failed to create checklist item",
            },
            500
        );
    }
};


// ============================================================
// UPDATE CHECKLIST
// PATCH /cards/:cardId/checklists/:checklistId
// ============================================================

export const updateChecklist = async (
    c: Context<{ Variables: AuthVariables }>
) => {
    try {
        const authUser = c.get("user");

        const checklistId = Number(
            c.req.param("checklistId")
        );

        if (
            !Number.isInteger(checklistId) ||
            checklistId <= 0
        ) {
            return c.json(
                {
                    success: false,
                    message: "Invalid checklist ID",
                },
                400
            );
        }

        const body = await c.req.json();

        const result = await updateChecklistService(
            checklistId,
            authUser.userId,
            {
                title: body.title,
                isCompleted: body.isCompleted,
            }
        );

        if (!result.success) {
            if (
                result.reason ===
                "CHECKLIST_NOT_FOUND"
            ) {
                return c.json(
                    {
                        success: false,
                        message:
                            "Checklist not found or you do not have access",
                    },
                    404
                );
            }

            if (
                result.reason ===
                "TITLE_REQUIRED"
            ) {
                return c.json(
                    {
                        success: false,
                        message:
                            "Checklist title is required",
                    },
                    400
                );
            }
        }

        return c.json({
            success: true,
            message:
                "Checklist updated successfully",
            checklist: result.checklist,
        });
    } catch (error) {
        console.error(
            "Update checklist error:",
            error
        );

        return c.json(
            {
                success: false,
                message: "Failed to update checklist",
            },
            500
        );
    }
};


// ============================================================
// DELETE CHECKLIST
// DELETE /cards/:cardId/checklists/:checklistId
// ============================================================

export const deleteChecklist = async (
    c: Context<{ Variables: AuthVariables }>
) => {
    try {
        const authUser = c.get("user");

        const checklistId = Number(
            c.req.param("checklistId")
        );

        if (
            !Number.isInteger(checklistId) ||
            checklistId <= 0
        ) {
            return c.json(
                {
                    success: false,
                    message: "Invalid checklist ID",
                },
                400
            );
        }

        const result = await deleteChecklistService(
            checklistId,
            authUser.userId
        );

        if (!result.success) {
            if (
                result.reason ===
                "CHECKLIST_NOT_FOUND"
            ) {
                return c.json(
                    {
                        success: false,
                        message:
                            "Checklist not found or you do not have access",
                    },
                    404
                );
            }
        }

        return c.json({
            success: true,
            message:
                "Checklist deleted successfully",
            checklist: result.checklist,
        });
    } catch (error) {
        console.error(
            "Delete checklist error:",
            error
        );

        return c.json(
            {
                success: false,
                message: "Failed to delete checklist",
            },
            500
        );
    }
};