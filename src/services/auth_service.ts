import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, type User } from "../db/schema/users.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signToken } from "../lib/jwt.js";
import { slugify } from "../lib/slug.js";
import { ensureUniqueSlug, isUserEmailExists } from "../validations/custom-validations.js";
import {
  ConflictError,
  InternalServerError,
  UnauthorizedError,
} from "../exceptions/index.js";
import type { RegisterInput, LoginInput } from "../validators/users.validator.js";

export type SafeUser = Omit<User, "passwordHash">;

export function toSafeUser(u: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = u;
  return safe;
}

// ─── Register: self-signup, always role "user" ──────────────────────────────
export async function register(input: RegisterInput): Promise<{ user: SafeUser; token: string }> {
  if (await isUserEmailExists(input.email)) throw new ConflictError("Email already in use");

  const base = (input.slug ?? slugify(input.name)).slice(0, 100);
  const slug = await ensureUniqueSlug(base);

  const inserted = await db
    .insert(users)
    .values({
      name: input.name,
      slug,
      email: input.email,
      passwordHash: hashPassword(input.password),
      role: "user",
      avatarUrl: input.avatarUrl ?? null,
    })
    .returning();

  const user = inserted[0];
  if (!user) throw new InternalServerError("Failed to create user");
  const token = await signToken(user.id, user.role);
  return { user: toSafeUser(user), token };
}

// ─── Login ──────────────────────────────────────────────────────────────────
export async function login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
  const rows = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  const user = rows[0];
  if (!user || user.deletedAt || !user.isActive) {
    throw new UnauthorizedError("Invalid email or password");
  }
  if (!verifyPassword(input.password, user.passwordHash)) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const token = await signToken(user.id, user.role);
  return { user: toSafeUser(user), token };
}
