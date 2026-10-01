import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";

import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import type { z } from "zod";
import {
  loginSchema,
  registerSchema,
} from "../validators/users.validator.js";

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

export const registerUser = async (input: RegisterInput) => {
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existingUser.length > 0) {
    return {
      success: false as const,
      reason: "EMAIL_EXISTS" as const,
    };
  }

  const slug =
    input.slug ??
    input.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);

  const passwordHash = await argon2.hash(input.password);

  const [newUser] = await db
    .insert(users)
    .values({
      name: input.name,
      slug,
      email: input.email,
      passwordHash,
      avatarUrl: input.avatarUrl,
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
    });

  return {
    success: true as const,
    user: newUser,
  };
};

export const loginUser = async (input: LoginInput) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (result.length === 0) {
    return {
      success: false as const,
      reason: "INVALID_CREDENTIALS" as const,
    };
  }

  const user = result[0];

  if (!user.isActive || user.deletedAt) {
    return {
      success: false as const,
      reason: "ACCOUNT_INACTIVE" as const,
    };
  }

  const passwordValid = await argon2.verify(
    user.passwordHash,
    input.password,
  );

  if (!passwordValid) {
    return {
      success: false as const,
      reason: "INVALID_CREDENTIALS" as const,
    };
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const secret = new TextEncoder().encode(jwtSecret);

  const token = await new SignJWT({
    userId: user.id,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return {
    success: true as const,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
  };
};
export const checkEmailExists = async (email: string) => {
    const existingUser = await db
        .select({
            id: users.id,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    return existingUser.length > 0;
};