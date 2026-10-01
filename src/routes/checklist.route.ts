import { Hono } from "hono";

import {
    authMiddleware,
    AuthVariables,
} from "../middleware/auth.middleware.js";

import {
    getChecklists,
    createChecklist,
    updateChecklist,
    deleteChecklist,
} from "../controller/checklist.controller.js";

const checklistRoutes = new Hono<{
    Variables: AuthVariables;
}>();


// Get all checklist items for a card
checklistRoutes.get(
    "/:cardId/checklists",
    authMiddleware,
    getChecklists
);


// Create checklist item
checklistRoutes.post(
    "/:cardId/checklists",
    authMiddleware,
    createChecklist
);


// Update checklist item
checklistRoutes.patch(
    "/:cardId/checklists/:checklistId",
    authMiddleware,
    updateChecklist
);


// Delete checklist item
checklistRoutes.delete(
    "/:cardId/checklists/:checklistId",
    authMiddleware,
    deleteChecklist
);


export default checklistRoutes;