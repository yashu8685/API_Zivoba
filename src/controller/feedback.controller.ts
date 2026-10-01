import type { Context } from "hono";

import {
    createFeedback,
} from "../service/feedback.service.js";

export const submitFeedback = async (c: Context) => {
    try {
        const authUser = c.get("user");
        const body = await c.req.json();

        const message =
            typeof body.message === "string"
                ? body.message.trim()
                : undefined;

        if (!message) {
            return c.json(
                {
                    success: false,
                    message: "Feedback message is required",
                },
                400
            );
        }

        const feedback = await createFeedback(
            authUser.userId,
            message
        );

        return c.json(
            {
                success: true,
                message: "Feedback submitted successfully",
                feedback,
            },
            201
        );
    } catch (error) {
        console.error("Submit feedback error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to submit feedback",
            },
            500
        );
    }
};