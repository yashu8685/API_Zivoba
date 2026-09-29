import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { boards, type Board } from "../db/schema/boards.js";
import { boardMembers, type BoardMember } from "../db/schema/board_members.js";
import { workspaces } from "../db/schema/workspaces.js";
import { users } from "../db/schema/users.js";
import { slugify } from "../lib/slug.js";
import {
  ensureRosterMember,
  ensureUniqueBoardSlug,
  isBoardMember,
  isBoardNameExists,
  pruneRosterMember,
} from "../validations/custom-validations.js";
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "../exceptions/index.js";
import { toSafeUser, type SafeUser } from "./auth_service.js";
import type { CreateBoardInput, UpdateBoardInput } from "../validators/boards.validator.js";
import type {
  AddBoardMemberInput,
  UpdateBoardMemberRoleInput,
} from "../validators/board_members.validator.js";

export type BoardMemberView = SafeUser & {
  boardRole: BoardMember["role"];
  joinedAt: BoardMember["joinedAt"];
};

type Viewer = { id: number; role: "superadmin" | "user" };

// Live board or 404 (excludes soft-deleted).
async function requireLiveBoard(boardId: number): Promise<Board> {
  const rows = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1);
  const board = rows[0];
  if (!board || board.deletedAt) throw new NotFoundError("Board not found");
  return board;
}

// Superadmin sees everything; others must be board members.
function requireBoardAccess(viewer: Viewer, member: boolean): void {
  if (viewer.role === "superadmin") return;
  if (!member) throw new ForbiddenError("Not a board member");
}

async function toBoardMemberView(boardId: number, userId: number): Promise<BoardMemberView> {
  const rows = await db
    .select()
    .from(boardMembers)
    .innerJoin(users, eq(users.id, boardMembers.userId))
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new NotFoundError("Board member not found");
  return {
    ...toSafeUser(row.users),
    boardRole: row.board_members.role,
    joinedAt: row.board_members.joinedAt,
  };
}

// ─── List: superadmin sees all; users see member boards (optional workspace filter)
export async function listBoards(
  viewer: Viewer,
  opts: { workspaceId?: number; limit?: number; offset?: number }
): Promise<{ data: Board[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const live = isNull(boards.deletedAt);
  const scoped = opts.workspaceId
    ? and(live, eq(boards.workspaceId, opts.workspaceId))
    : live;

  if (viewer.role === "superadmin") {
    const rows = await db.select().from(boards).where(scoped).limit(limit).offset(offset);
    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(boards)
      .where(scoped);
    return { data: rows, total: Number(countRows[0]?.count ?? 0) };
  }

  const rows = await db
    .select()
    .from(boards)
    .innerJoin(
      boardMembers,
      and(eq(boardMembers.boardId, boards.id), eq(boardMembers.userId, viewer.id))
    )
    .where(scoped)
    .limit(limit)
    .offset(offset);
  return { data: rows.map((r) => r.boards), total: rows.length };
}

// ─── Get one (access-checked) ───────────────────────────────────────────────
export async function getBoardById(boardId: number, viewer: Viewer): Promise<Board> {
  const board = await requireLiveBoard(boardId);
  requireBoardAccess(viewer, await isBoardMember(boardId, viewer.id));
  return board;
}

// ─── Create (superadmin only — route enforces). Creator becomes board owner.
export async function createBoard(input: CreateBoardInput, creatorId: number): Promise<Board> {
  const wsRows = await db
    .select({ id: workspaces.id, deletedAt: workspaces.deletedAt })
    .from(workspaces)
    .where(eq(workspaces.id, input.workspaceId))
    .limit(1);
  const workspace = wsRows[0];
  if (!workspace || workspace.deletedAt) throw new NotFoundError("Workspace not found");

  if (await isBoardNameExists(input.workspaceId, input.name)) {
    throw new ConflictError("Board name already in use in this workspace");
  }
  const slug = await ensureUniqueBoardSlug(
    input.workspaceId,
    (input.slug ?? slugify(input.name, 150)).slice(0, 150)
  );

  const inserted = await db
    .insert(boards)
    .values({
      workspaceId: input.workspaceId,
      name: input.name,
      slug,
      description: input.description ?? null,
      createdBy: creatorId,
    })
    .returning();
  const board = inserted[0];
  if (!board) throw new InternalServerError("Failed to create board");

  await db.insert(boardMembers).values({ boardId: board.id, userId: creatorId, role: "owner" });
  await ensureRosterMember(input.workspaceId, creatorId, "owner");
  return board;
}

// ─── Update (superadmin only — route enforces) ──────────────────────────────
export async function updateBoard(boardId: number, input: UpdateBoardInput): Promise<Board> {
  const existing = await requireLiveBoard(boardId);

  if (input.name && input.name !== existing.name) {
    if (await isBoardNameExists(existing.workspaceId, input.name, boardId)) {
      throw new ConflictError("Board name already in use in this workspace");
    }
  }

  let slug = existing.slug;
  if (input.slug) slug = await ensureUniqueBoardSlug(existing.workspaceId, input.slug, boardId);

  const updated = await db
    .update(boards)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      slug,
      ...(input.description !== undefined ? { description: input.description } : {}),
    })
    .where(eq(boards.id, boardId))
    .returning();
  const board = updated[0];
  if (!board) throw new NotFoundError("Board not found");
  return board;
}

// ─── Soft delete / restore (superadmin only — route enforces) ───────────────
export async function softDeleteBoard(boardId: number): Promise<void> {
  await requireLiveBoard(boardId);
  await db.update(boards).set({ deletedAt: new Date() }).where(eq(boards.id, boardId));
}

export async function restoreBoard(boardId: number): Promise<Board> {
  const rows = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1);
  if (!rows[0]) throw new NotFoundError("Board not found");
  const updated = await db
    .update(boards)
    .set({ deletedAt: null })
    .where(eq(boards.id, boardId))
    .returning();
  const board = updated[0];
  if (!board) throw new NotFoundError("Board not found");
  return board;
}

// ─── Members ────────────────────────────────────────────────────────────────
export async function listBoardMembers(boardId: number, viewer: Viewer): Promise<BoardMemberView[]> {
  await requireLiveBoard(boardId);
  requireBoardAccess(viewer, await isBoardMember(boardId, viewer.id));
  const rows = await db
    .select()
    .from(boardMembers)
    .innerJoin(users, eq(users.id, boardMembers.userId))
    .where(and(eq(boardMembers.boardId, boardId), isNull(users.deletedAt)));
  return rows.map((r) => ({
    ...toSafeUser(r.users),
    boardRole: r.board_members.role,
    joinedAt: r.board_members.joinedAt,
  }));
}

// Assign (superadmin only — route enforces). Syncs the workspace roster.
export async function addBoardMember(
  boardId: number,
  input: AddBoardMemberInput
): Promise<BoardMemberView> {
  const board = await requireLiveBoard(boardId);

  const userRows = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  const user = userRows[0];
  if (!user || user.deletedAt || !user.isActive) throw new NotFoundError("User not found");

  if (await isBoardMember(boardId, input.userId)) {
    throw new ConflictError("User is already a board member");
  }

  await db.insert(boardMembers).values({ boardId, userId: input.userId, role: input.role });
  await ensureRosterMember(board.workspaceId, input.userId, input.role);
  return toBoardMemberView(boardId, input.userId);
}

// Role change (superadmin only — route enforces). Roster keeps highest role.
export async function updateBoardMemberRole(
  boardId: number,
  userId: number,
  input: UpdateBoardMemberRoleInput
): Promise<BoardMemberView> {
  const board = await requireLiveBoard(boardId);
  if (!(await isBoardMember(boardId, userId))) throw new NotFoundError("Board member not found");

  await db
    .update(boardMembers)
    .set({ role: input.role })
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)));
  await ensureRosterMember(board.workspaceId, userId, input.role);
  return toBoardMemberView(boardId, userId);
}

// Remove (superadmin only — route enforces). Prunes the roster if last board.
export async function removeBoardMember(boardId: number, userId: number): Promise<void> {
  const board = await requireLiveBoard(boardId);
  if (!(await isBoardMember(boardId, userId))) throw new NotFoundError("Board member not found");

  await db
    .delete(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)));
  await pruneRosterMember(board.workspaceId, userId);
}
