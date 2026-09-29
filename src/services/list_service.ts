import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { boards, type Board } from "../db/schema/boards.js";
import { lists, type List } from "../db/schema/lists.js";
import { slugify } from "../lib/slug.js";
import { isBoardMember } from "../validations/custom-validations.js";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "../exceptions/index.js";
import type {
  CreateListInput,
  ReorderListsInput,
  UpdateListInput,
} from "../validators/lists.validator.js";

type Viewer = { id: number; role: "superadmin" | "user" };

// Live board or 404 (a deleted board hides its lists too).
async function requireLiveBoard(boardId: number): Promise<Board> {
  const rows = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1);
  const board = rows[0];
  if (!board || board.deletedAt) throw new NotFoundError("Board not found");
  return board;
}

// Board members manage lists freely inside their board; superadmin bypasses.
async function requireListAccess(boardId: number, viewer: Viewer): Promise<Board> {
  const board = await requireLiveBoard(boardId);
  if (viewer.role !== "superadmin" && !(await isBoardMember(boardId, viewer.id))) {
    throw new ForbiddenError("Not a board member");
  }
  return board;
}

async function requireLiveList(listId: number): Promise<List> {
  const rows = await db.select().from(lists).where(eq(lists.id, listId)).limit(1);
  const list = rows[0];
  if (!list || list.deletedAt) throw new NotFoundError("List not found");
  return list;
}

// ─── List board's lists, ordered by position ────────────────────────────────
export async function listBoardLists(boardId: number, viewer: Viewer): Promise<List[]> {
  await requireListAccess(boardId, viewer);
  return db
    .select()
    .from(lists)
    .where(and(eq(lists.boardId, boardId), isNull(lists.deletedAt)))
    .orderBy(asc(lists.position), asc(lists.id));
}

// ─── Get one (access via parent board) ──────────────────────────────────────
export async function getListById(listId: number, viewer: Viewer): Promise<List> {
  const list = await requireLiveList(listId);
  await requireListAccess(list.boardId, viewer);
  return list;
}

// ─── Create (board members + superadmin) ────────────────────────────────────
export async function createList(input: CreateListInput, viewer: Viewer): Promise<List> {
  await requireListAccess(input.boardId, viewer);
  const slug = (input.slug ?? slugify(input.title, 150)).slice(0, 150);

  const inserted = await db
    .insert(lists)
    .values({
      boardId: input.boardId,
      title: input.title,
      slug,
      position: input.position,
    })
    .returning();
  const list = inserted[0];
  if (!list) throw new InternalServerError("Failed to create list");
  return list;
}

// ─── Update (board members + superadmin) ────────────────────────────────────
export async function updateList(
  listId: number,
  input: UpdateListInput,
  viewer: Viewer
): Promise<List> {
  const existing = await requireLiveList(listId);
  await requireListAccess(existing.boardId, viewer);

  let slug = existing.slug;
  if (input.slug) slug = input.slug;
  else if (input.title !== undefined) slug = slugify(input.title, 150).slice(0, 150);

  const updated = await db
    .update(lists)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      slug,
      ...(input.position !== undefined ? { position: input.position } : {}),
    })
    .where(eq(lists.id, listId))
    .returning();
  const list = updated[0];
  if (!list) throw new NotFoundError("List not found");
  return list;
}

// ─── Soft delete / restore (board members + superadmin) ─────────────────────
export async function softDeleteList(listId: number, viewer: Viewer): Promise<void> {
  const existing = await requireLiveList(listId);
  await requireListAccess(existing.boardId, viewer);
  await db.update(lists).set({ deletedAt: new Date() }).where(eq(lists.id, listId));
}

export async function restoreList(listId: number, viewer: Viewer): Promise<List> {
  const rows = await db.select().from(lists).where(eq(lists.id, listId)).limit(1);
  const existing = rows[0];
  if (!existing) throw new NotFoundError("List not found");
  await requireListAccess(existing.boardId, viewer);
  const updated = await db
    .update(lists)
    .set({ deletedAt: null })
    .where(eq(lists.id, listId))
    .returning();
  const list = updated[0];
  if (!list) throw new NotFoundError("List not found");
  return list;
}

// ─── Reorder (drag-drop): positions follow the order of orderedIds ───────────
export async function reorderLists(
  boardId: number,
  input: ReorderListsInput,
  viewer: Viewer
): Promise<List[]> {
  await requireListAccess(boardId, viewer);

  const rows = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.boardId, boardId), isNull(lists.deletedAt)));
  const liveIds = new Set(rows.map((r) => r.id));
  const seen = new Set<number>();
  for (const id of input.orderedIds) {
    if (seen.has(id) || !liveIds.has(id)) {
      throw new BadRequestError("orderedIds must match the board's live lists exactly once each");
    }
    seen.add(id);
  }
  if (seen.size !== liveIds.size) {
    throw new BadRequestError("orderedIds must include every live list on the board");
  }

  for (let position = 0; position < input.orderedIds.length; position++) {
    await db
      .update(lists)
      .set({ position })
      .where(eq(lists.id, input.orderedIds[position]!));
  }
  return listBoardLists(boardId, viewer);
}
