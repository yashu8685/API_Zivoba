import { Hono } from "hono";

import {
    authMiddleware,
    AuthVariables,
} from "../middleware/auth.middleware.js";

import {
    submitFeedback,
} from "../controller/feedback.controller.js";

const feedbackRoutes = new Hono<{
    Variables: AuthVariables;
}>();

feedbackRoutes.post(
    "/",
    authMiddleware,
    submitFeedback
);

export default feedbackRoutes;