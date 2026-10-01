import { Context, Next } from "hono";
import { jwtVerify } from "jose";

export type AuthUser = {
  userId: number;
  role: "superadmin" | "user";
};

export type AuthVariables = {
  user: AuthUser;
};

export async function authMiddleware(c: Context, next: Next) {
  try {
    const authorization = c.req.header("Authorization");

    if (!authorization) {
      return c.json(
        {
          success: false,
          message: "Authorization token is required",
        },
        401
      );
    }

    if (!authorization.startsWith("Bearer ")) {
      return c.json(
        {
          success: false,
          message: "Invalid authorization format",
        },
        401
      );
    }

    const token = authorization.substring(7);

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const secret = new TextEncoder().encode(jwtSecret);

    const { payload } = await jwtVerify(token, secret);

    const userId = Number(payload.userId);
    const role = payload.role;

    if (!Number.isInteger(userId) || userId <= 0) {
      return c.json(
        {
          success: false,
          message: "Invalid user information in token",
        },
        401
      );
    }

    if (role !== "user" && role !== "superadmin") {
      return c.json(
        {
          success: false,
          message: "Invalid user role",
        },
        401
      );
    }

    c.set("user", {
      userId,
      role,
    });

    await next();
  } catch (error) {
    console.error("Authentication error:", error);

    return c.json(
      {
        success: false,
        message: "Invalid or expired token",
      },
      401
    );
  }
}