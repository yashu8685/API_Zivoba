import { and, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { slugify } from "../lib/slug.js";
import { ensureUniqueSlug, isUserEmailExists } from "../validations/custom-validations.js";
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "../exceptions/index.js";
import { toSafeUser, type SafeUser } from "./auth_service.js";
import type {
  CreateUserInput,
  UpdateUserInput,
  ChangePasswordInput,
} from "../validators/users.validator.js";

// ─── List (admin search: ?q= matches name/email, excludes soft-deleted) ─────
export async function listUsers(opts: { q?: string; limit?: number; offset?: number }): Promise<{
  data: SafeUser[];
  total: number;
}> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const base = isNull(users.deletedAt);

  const where = opts.q
    ? and(base, or(ilike(users.name, `%${opts.q}%`), ilike(users.email, `%${opts.q}%`)))
    : base;

  const rows = await db.select().from(users).where(where).limit(limit).offset(offset);
  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(where);
  return { data: rows.map(toSafeUser), total: Number(countRows[0]?.count ?? 0) };
}

// ─── Get by id (excludes soft-deleted) ──────────────────────────────────────
export async function getUserById(id: number): Promise<SafeUser> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const user = rows[0];
  if (!user || user.deletedAt) throw new NotFoundError("User not found");
  return toSafeUser(user);
}

// ─── Create (superadmin only, explicit role) ────────────────────────────────
export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  if (await isUserEmailExists(input.email)) throw new ConflictError("Email already in use");

  const slug = await ensureUniqueSlug((input.slug ?? slugify(input.name)).slice(0, 100));

  const inserted = await db
    .insert(users)
    .values({
      name: input.name,
      slug,
      email: input.email,
      passwordHash: hashPassword(input.password),
      role: input.role,
      avatarUrl: input.avatarUrl ?? null,
      isActive: input.isActive,
    })
    .returning();
  const user = inserted[0];
  if (!user) throw new InternalServerError("Failed to create user");
  return toSafeUser(user);
}

// ─── Update ─────────────────────────────────────────────────────────────────
export async function updateUser(id: number, input: UpdateUserInput): Promise<SafeUser> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const existing = rows[0];
  if (!existing || existing.deletedAt) throw new NotFoundError("User not found");

  if (input.email && input.email !== existing.email) {
    if (await isUserEmailExists(input.email, id)) throw new ConflictError("Email already in use");
  }

  let slug = existing.slug;
  if (input.slug) {
    slug = await ensureUniqueSlug(input.slug, id);
  } else if (input.name && input.name !== existing.name) {
    // Keep existing slug unless explicitly changed (stable URLs).
    slug = existing.slug;
  }

  const updated = await db
    .update(users)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      slug,
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    })
    .where(eq(users.id, id))
    .returning();
  const user = updated[0];
  if (!user) throw new NotFoundError("User not found");
  return toSafeUser(user);
}

// ─── Change password ────────────────────────────────────────────────────────
export async function changePassword(
  id: number,
  input: ChangePasswordInput,
  opts?: { skipCurrentCheck?: boolean }
): Promise<void> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const user = rows[0];
  if (!user || user.deletedAt) throw new NotFoundError("User not found");

  if (!opts?.skipCurrentCheck && !verifyPassword(input.currentPassword, user.passwordHash)) {
    throw new UnauthorizedError("Current password is incorrect");
  }
  await db
    .update(users)
    .set({ passwordHash: hashPassword(input.newPassword) })
    .where(eq(users.id, id));
}

// ─── Soft delete / restore ──────────────────────────────────────────────────
export async function softDeleteUser(id: number): Promise<void> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!rows[0] || rows[0].deletedAt) throw new NotFoundError("User not found");
  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id));
}

export async function restoreUser(id: number): Promise<SafeUser> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("User not found");
  const updated = await db
    .update(users)
    .set({ deletedAt: null })
    .where(eq(users.id, id))
    .returning();
  const user = updated[0];
  if (!user) throw new NotFoundError("User not found");
  return toSafeUser(user);
}
