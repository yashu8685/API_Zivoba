import type { MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { verifyToken } from "../lib/jwt.js";
import { StatusCodes } from "../exceptions/index.js";
import type { AppVariables } from "../types/app.js";

export type { AppVariables, AuthUser, AppContext, AuthedContext } from "../types/app.js";

// JWT Bearer verify. Sets c.get("user"). Skips soft-deleted / inactive users.
export const authMiddleware: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, StatusCodes.UNAUTHORIZED);
  }
  const token = header.slice(7).trim();
  if (!token) return c.json({ error: "Missing token" }, StatusCodes.UNAUTHORIZED);

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    return c.json({ error: "Invalid or expired token" }, StatusCodes.UNAUTHORIZED);
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      slug: users.slug,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  const found = rows[0];
  if (!found) return c.json({ error: "User not found" }, StatusCodes.UNAUTHORIZED);

  // Reject soft-deleted or deactivated accounts at request time.
  if (found.deletedAt || !found.isActive) {
    return c.json({ error: "Account is inactive" }, StatusCodes.UNAUTHORIZED);
  }

  const { deletedAt: _deletedAt, ...user } = found;
  c.set("user", user);
  await next();
};

// Must run after authMiddleware. Only role = superadmin passes.
export const requireSuperadmin: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, StatusCodes.UNAUTHORIZED);
  if (user.role !== "superadmin")
    return c.json({ error: "Forbidden: superadmin only" }, StatusCodes.FORBIDDEN);
  await next();
};
