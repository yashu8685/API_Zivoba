import { Hono } from "hono";

import {
    authMiddleware,
    AuthVariables,
} from "../middleware/auth.middleware.js";

import { getLists,getMembers } from "../controller/board.controller.js";

const boardRoutes = new Hono<{
    Variables: AuthVariables;
}>();

boardRoutes.get(
    "/:boardId/lists",
    authMiddleware,
    getLists
);
boardRoutes.get("/:boardId/members",authMiddleware,getMembers);

export default boardRoutes;