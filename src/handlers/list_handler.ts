import type { Context } from "hono";
import { BadRequestError, StatusCodes, toErrorResponse } from "../exceptions/index.js";
import { validateReqPayload } from "../validations/validate-req.js";
import {
  listBoardLists,
  getListById,
  createList,
  updateList,
  softDeleteList,
  restoreList,
  reorderLists,
} from "../services/list_service.js";
import type { AuthedContext } from "../types/app.js";
import type {
  CreateListInput,
  ReorderListsInput,
  UpdateListInput,
} from "../validators/lists.validator.js";

async function readJsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }
}

function parseId(param: string | undefined): number | null {
  if (!param) return null;
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /lists?boardId= — boardId required (lists are board-scoped).
export async function listBoardListsHandler(c: AuthedContext) {
  try {
    const boardId = parseId(c.req.query("boardId"));
    if (!boardId) throw new BadRequestError("boardId query is required");
    const lists = await listBoardLists(boardId, c.get("user"));
    return c.json({ data: lists, total: lists.length }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// POST /lists — board members + superadmin (service enforces).
export async function createListHandler(c: AuthedContext) {
  try {
    const body = await validateReqPayload<CreateListInput>(
      "list:create",
      await readJsonBody(c),
      "Invalid list data"
    );
    const list = await createList(body, c.get("user"));
    return c.json({ data: list }, StatusCodes.CREATED);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// GET /lists/:id — via parent board access (service enforces).
export async function getListHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const list = await getListById(id, c.get("user"));
    return c.json({ data: list }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// PATCH /lists/:id — board members + superadmin (service enforces).
export async function updateListHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const body = await validateReqPayload<UpdateListInput>(
      "list:update",
      await readJsonBody(c),
      "Invalid list data"
    );
    const list = await updateList(id, body, c.get("user"));
    return c.json({ data: list }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// DELETE /lists/:id — board members + superadmin (service enforces).
export async function deleteListHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    await softDeleteList(id, c.get("user"));
    return c.json({ message: "List deleted" }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// POST /lists/:id/restore — board members + superadmin (service enforces).
export async function restoreListHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const list = await restoreList(id, c.get("user"));
    return c.json({ data: list }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// PATCH /boards/:id/lists/reorder — drag-drop (service enforces access).
export async function reorderListsHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const body = await validateReqPayload<ReorderListsInput>(
      "list:reorder",
      await readJsonBody(c),
      "Invalid reorder data"
    );
    const lists = await reorderLists(id, body, c.get("user"));
    return c.json({ data: lists, total: lists.length }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}
