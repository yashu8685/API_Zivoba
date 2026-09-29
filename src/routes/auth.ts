import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import type { AppVariables } from "../types/app.js";
import { registerHandler, loginHandler, meHandler } from "../handlers/auth_handler.js";

// Endpoints only — validation happens inside handlers via validateReqPayload,
// request/response in handlers, DB in services.
const auth = new Hono<{ Variables: AppVariables }>();

auth.post("/register", registerHandler);
auth.post("/login", loginHandler);
auth.get("/me", authMiddleware, meHandler);

export default auth;
