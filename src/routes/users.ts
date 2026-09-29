import { Hono } from "hono";
import { authMiddleware, requireSuperadmin } from "../middleware/auth.js";
import type { AppVariables } from "../types/app.js";
import {
  listUsersHandler,
  createUserHandler,
  getMeHandler,
  updateMeHandler,
  changeMyPasswordHandler,
  getUserHandler,
  updateUserHandler,
  resetPasswordHandler,
  deleteUserHandler,
  restoreUserHandler,
} from "../handlers/user_handler.js";

// Endpoints only — validation happens inside handlers via validateReqPayload,
// request/response in handlers, DB in services.
const users = new Hono<{ Variables: AppVariables }>();

users.use("*", authMiddleware);

users.get("/", requireSuperadmin, listUsersHandler);
users.post("/", requireSuperadmin, createUserHandler);

users.get("/me", getMeHandler);
users.patch("/me", updateMeHandler);
users.patch("/me/password", changeMyPasswordHandler);

users.get("/:id", getUserHandler);
users.patch("/:id", updateUserHandler);
users.patch("/:id/password", requireSuperadmin, resetPasswordHandler);
users.delete("/:id", requireSuperadmin, deleteUserHandler);
users.post("/:id/restore", requireSuperadmin, restoreUserHandler);

export default users;
