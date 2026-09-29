import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { workspaces } from "../db/schema/workspaces.js";
import { workspaceMembers } from "../db/schema/workspace_members.js";
import { boards } from "../db/schema/boards.js";
import { boardMembers } from "../db/schema/board_members.js";
import { InternalServerError } from "../exceptions/index.js";
import { bumpSlug } from "../lib/slug.js";
import type { WorkspaceRole } from "../validators/enums.validator.js";

// ─── DB existence checks (single source for services) ───────────────────────
// Mirrors the reference project's custom-validations: `id` excludes the row
// being updated so self-matches don't count as conflicts.

// Email is globally unique (users.email) — used by register + create/update.
export async function isUserEmailExists(email: string, id?: number): Promise<boolean> {
  const rows =
    id !== undefined
      ? await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.email, email), ne(users.id, id)))
          .limit(1)
      : await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
  return rows.length > 0;
}

// Slug is globally unique (users.slug) — used by register + create/update.
export async function isUserSlugExists(slug: string, id?: number): Promise<boolean> {
  const rows =
    id !== undefined
      ? await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.slug, slug), ne(users.id, id)))
          .limit(1)
      : await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.slug, slug))
          .limit(1);
  return rows.length > 0;
}

// Dedupe loop: "my-slug" -> "my-slug-2" -> "my-slug-3" until free.
export async function ensureUniqueSlug(base: string, id?: number, max = 100): Promise<string> {
  let slug = base.slice(0, max);
  for (let i = 0; i < 50; i++) {
    if (!(await isUserSlugExists(slug, id))) return slug;
    slug = bumpSlug(slug, max);
  }
  throw new InternalServerError("Could not generate unique slug");
}

// ─── Workspaces: name + slug are globally unique ────────────────────────────
export async function isWorkspaceNameExists(name: string, id?: number): Promise<boolean> {
  const rows =
    id !== undefined
      ? await db
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(and(eq(workspaces.name, name), ne(workspaces.id, id)))
          .limit(1)
      : await db
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.name, name))
          .limit(1);
  return rows.length > 0;
}

export async function isWorkspaceSlugExists(slug: string, id?: number): Promise<boolean> {
  const rows =
    id !== undefined
      ? await db
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(and(eq(workspaces.slug, slug), ne(workspaces.id, id)))
          .limit(1)
      : await db
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.slug, slug))
          .limit(1);
  return rows.length > 0;
}

export async function ensureUniqueWorkspaceSlug(base: string, id?: number, max = 150): Promise<string> {
  let slug = base.slice(0, max);
  for (let i = 0; i < 50; i++) {
    if (!(await isWorkspaceSlugExists(slug, id))) return slug;
    slug = bumpSlug(slug, max);
  }
  throw new InternalServerError("Could not generate unique slug");
}

// Roster lookup: is this user on the workspace roster? Used for access checks.
// (Roster is auto-maintained from board assignments — never directly assigned.)
export async function isWorkspaceMember(workspaceId: number, userId: number): Promise<boolean> {
  const rows = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

// ─── Boards: (workspaceId, name) + (workspaceId, slug) are unique ────────────
export async function isBoardNameExists(
  workspaceId: number,
  name: string,
  excludeId?: number
): Promise<boolean> {
  const condition =
    excludeId !== undefined
      ? and(
          eq(boards.workspaceId, workspaceId),
          eq(boards.name, name),
          ne(boards.id, excludeId)
        )
      : and(eq(boards.workspaceId, workspaceId), eq(boards.name, name));
  const rows = await db.select({ id: boards.id }).from(boards).where(condition).limit(1);
  return rows.length > 0;
}

export async function isBoardSlugExists(
  workspaceId: number,
  slug: string,
  excludeId?: number
): Promise<boolean> {
  const condition =
    excludeId !== undefined
      ? and(
          eq(boards.workspaceId, workspaceId),
          eq(boards.slug, slug),
          ne(boards.id, excludeId)
        )
      : and(eq(boards.workspaceId, workspaceId), eq(boards.slug, slug));
  const rows = await db.select({ id: boards.id }).from(boards).where(condition).limit(1);
  return rows.length > 0;
}

export async function ensureUniqueBoardSlug(
  workspaceId: number,
  base: string,
  excludeId?: number,
  max = 150
): Promise<string> {
  let slug = base.slice(0, max);
  for (let i = 0; i < 50; i++) {
    if (!(await isBoardSlugExists(workspaceId, slug, excludeId))) return slug;
    slug = bumpSlug(slug, max);
  }
  throw new InternalServerError("Could not generate unique slug");
}

// Board membership lookup — used for access checks + duplicate assigns.
export async function isBoardMember(boardId: number, userId: number): Promise<boolean> {
  const rows = await db
    .select({ id: boardMembers.id })
    .from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

// ─── Roster auto-maintain (workspace_members) ───────────────────────────────
// The roster is the workspace's complete member list, derived from board
// assignments. Role kept = highest the user holds on any board here.
const ROLE_RANK: Record<WorkspaceRole, number> = { owner: 3, admin: 2, member: 1 };

export async function ensureRosterMember(
  workspaceId: number,
  userId: number,
  role: WorkspaceRole
): Promise<void> {
  const rows = await db
    .select({ id: workspaceMembers.id, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);
  const existing = rows[0];
  if (!existing) {
    await db.insert(workspaceMembers).values({ workspaceId, userId, role });
    return;
  }
  if (ROLE_RANK[role] > ROLE_RANK[existing.role]) {
    await db.update(workspaceMembers).set({ role }).where(eq(workspaceMembers.id, existing.id));
  }
}

// Prune: drop the roster row only if the user has no other (live) boards here.
export async function pruneRosterMember(workspaceId: number, userId: number): Promise<void> {
  const remaining = await db
    .select({ id: boardMembers.id })
    .from(boardMembers)
    .innerJoin(boards, eq(boards.id, boardMembers.boardId))
    .where(
      and(
        eq(boards.workspaceId, workspaceId),
        eq(boardMembers.userId, userId),
        isNull(boards.deletedAt)
      )
    )
    .limit(1);
  if (remaining.length > 0) return;
  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    );
}
