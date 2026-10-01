import { Hono } from "hono";

import {
    authMiddleware,
    AuthVariables,
} from "../middleware/auth.middleware.js";

import {
    getMe,
    getBoards,
    updateMe,
    changePassword,
} from "../controller/user.controller.js";

const userRoutes = new Hono<{
    Variables: AuthVariables;
}>();

userRoutes.get("/me", authMiddleware, getMe);

userRoutes.get("/boards", authMiddleware, getBoards);
userRoutes.patch("/me", authMiddleware, updateMe);
userRoutes.patch(
  "/me/password",
  authMiddleware,
  changePassword
);

export default userRoutes;