import { Hono } from "hono";

import {
    authMiddleware,
    AuthVariables,
    
} from "../middleware/auth.middleware.js";
import {
    getCards,
    createList,
    updateList,
    deleteList,
     markListDone,
} from "../controller/list.controller.js";

const listRoutes = new Hono<{
    Variables: AuthVariables;
}>();
listRoutes.patch(
    "/:listId",
    authMiddleware,
    updateList
);
listRoutes.patch(
    "/:listId/complete",
    authMiddleware,
    markListDone
);
listRoutes.get(
    "/:listId/cards",
    authMiddleware,
    getCards
);
listRoutes.post(
    "/",
    authMiddleware,
    createList
);
listRoutes.delete(
    "/:listId",
    authMiddleware,
    deleteList
);


export default listRoutes;