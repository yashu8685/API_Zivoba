import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { workspaces, type Workspace } from "../db/schema/workspaces.js";
import { boards } from "../db/schema/boards.js";
import { workspaceMembers, type WorkspaceMember } from "../db/schema/workspace_members.js";
import { users } from "../db/schema/users.js";
import { slugify } from "../lib/slug.js";
import {
  ensureUniqueWorkspaceSlug,
  isWorkspaceMember,
  isWorkspaceNameExists,
} from "../validations/custom-validations.js";
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "../exceptions/index.js";
import { toSafeUser, type SafeUser } from "./auth_service.js";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "../validators/workspaces.validator.js";

export type WorkspaceMemberView = SafeUser & {
  memberRole: WorkspaceMember["role"];
  joinedAt: WorkspaceMember["joinedAt"];
};

type Viewer = { id: number; role: "superadmin" | "user" };

// Loads workspace or 404s (excludes soft-deleted), then enforces access:
// superadmin sees everything, others must be on the roster.
async function requireWorkspaceAccess(id: number, viewer: Viewer): Promise<Workspace> {
  const rows = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  const workspace = rows[0];
  if (!workspace || workspace.deletedAt) throw new NotFoundError("Workspace not found");
  if (viewer.role !== "superadmin" && !(await isWorkspaceMember(id, viewer.id))) {
    throw new ForbiddenError("Not a workspace member");
  }
  return workspace;
}

// ─── List: superadmin sees all; users see roster workspaces ─────────────────
export async function listWorkspaces(
  viewer: Viewer,
  opts: { limit?: number; offset?: number }
): Promise<{ data: Workspace[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  if (viewer.role === "superadmin") {
    const rows = await db
      .select()
      .from(workspaces)
      .where(isNull(workspaces.deletedAt))
      .limit(limit)
      .offset(offset);
    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(workspaces)
      .where(isNull(workspaces.deletedAt));
    return { data: rows, total: Number(countRows[0]?.count ?? 0) };
  }

  const rows = await db
    .select()
    .from(workspaces)
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, viewer.id)
      )
    )
    .where(isNull(workspaces.deletedAt))
    .limit(limit)
    .offset(offset);
  return { data: rows.map((r) => r.workspaces), total: rows.length };
}

// ─── Get one (access-checked) ───────────────────────────────────────────────
export async function getWorkspaceById(id: number, viewer: Viewer): Promise<Workspace> {
  return requireWorkspaceAccess(id, viewer);
}

// ─── Create (superadmin only — route enforces). Creator becomes roster owner.
export async function createWorkspace(input: CreateWorkspaceInput, creatorId: number): Promise<Workspace> {
  if (await isWorkspaceNameExists(input.name)) throw new ConflictError("Workspace name already in use");

  const slug = await ensureUniqueWorkspaceSlug((input.slug ?? slugify(input.name, 150)).slice(0, 150));

  const inserted = await db
    .insert(workspaces)
    .values({
      name: input.name,
      slug,
      description: input.description ?? null,
      createdBy: creatorId,
    })
    .returning();
  const workspace = inserted[0];
  if (!workspace) throw new InternalServerError("Failed to create workspace");

  await db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: creatorId, role: "owner" });
  return workspace;
}

// ─── Update (superadmin only — route enforces) ──────────────────────────────
export async function updateWorkspace(id: number, input: UpdateWorkspaceInput): Promise<Workspace> {
  const rows = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  const existing = rows[0];
  if (!existing || existing.deletedAt) throw new NotFoundError("Workspace not found");

  if (input.name && input.name !== existing.name) {
    if (await isWorkspaceNameExists(input.name, id)) {
      throw new ConflictError("Workspace name already in use");
    }
  }

  let slug = existing.slug;
  if (input.slug) slug = await ensureUniqueWorkspaceSlug(input.slug, id);

  const updated = await db
    .update(workspaces)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      slug,
      ...(input.description !== undefined ? { description: input.description } : {}),
    })
    .where(eq(workspaces.id, id))
    .returning();
  const workspace = updated[0];
  if (!workspace) throw new NotFoundError("Workspace not found");
  return workspace;
}

// ─── Soft delete workspace + its boards (superadmin only — route enforces) ──
export async function softDeleteWorkspace(id: number): Promise<void> {
  const rows = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  if (!rows[0] || rows[0].deletedAt) throw new NotFoundError("Workspace not found");
  const now = new Date();
  await db.update(workspaces).set({ deletedAt: now }).where(eq(workspaces.id, id));
  await db.update(boards).set({ deletedAt: now }).where(eq(boards.workspaceId, id));
}

// ─── Restore workspace only (boards keep their state; restore via board APIs)
export async function restoreWorkspace(id: number): Promise<Workspace> {
  const rows = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Workspace not found");
  const updated = await db
    .update(workspaces)
    .set({ deletedAt: null })
    .where(eq(workspaces.id, id))
    .returning();
  const workspace = updated[0];
  if (!workspace) throw new NotFoundError("Workspace not found");
  return workspace;
}

// ─── Roster: complete member list of the workspace (access-checked) ─────────
// Auto-maintained from board assignments — read-only here.
export async function getWorkspaceMembers(id: number, viewer: Viewer): Promise<WorkspaceMemberView[]> {
  await requireWorkspaceAccess(id, viewer);
  const rows = await db
    .select()
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(
      and(eq(workspaceMembers.workspaceId, id), isNull(users.deletedAt))
    );
  return rows.map((r) => ({
    ...toSafeUser(r.users),
    memberRole: r.workspace_members.role,
    joinedAt: r.workspace_members.joinedAt,
  }));
}
