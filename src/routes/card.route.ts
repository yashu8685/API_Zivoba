import { Hono } from "hono";

import {
    authMiddleware,
    AuthVariables,
} from "../middleware/auth.middleware.js";

import {
    createCard,
    getCard,
    updateCard,
    deleteCard,
} from "../controller/card.controller.js";

const cardRoutes = new Hono<{
    Variables: AuthVariables;
}>();


cardRoutes.post(
    "/",
    authMiddleware,
    createCard
);

cardRoutes.get(
    "/:cardId",
    authMiddleware,
    getCard
);
cardRoutes.patch(
    "/:cardId",
    authMiddleware,
    updateCard
);
cardRoutes.delete(
    "/:cardId",
    authMiddleware,
    deleteCard
);

export default cardRoutes;