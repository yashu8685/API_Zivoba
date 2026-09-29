import type { Context } from "hono";
import type { User } from "../db/schema/users.js";

// Authenticated user stored via c.set("user", ...) in authMiddleware.
export type AuthUser = Pick<
  User,
  "id" | "name" | "slug" | "email" | "role" | "avatarUrl" | "isActive"
>;

// Hono variables available via c.get("user") on protected routes.
export type AppVariables = {
  user: AuthUser;
};

// Shared contexts — import these instead of re-declaring per file.
export type AppContext = Context<{ Variables: AppVariables }>;
export type AuthedContext = Context<{ Variables: AppVariables }>;
