import type { Context } from "hono";
import { BadRequestError, StatusCodes, toErrorResponse } from "../exceptions/index.js";
import { validateReqPayload } from "../validations/validate-req.js";
import {
  listBoards,
  getBoardById,
  createBoard,
  updateBoard,
  softDeleteBoard,
  restoreBoard,
  listBoardMembers,
  addBoardMember,
  updateBoardMemberRole,
  removeBoardMember,
} from "../services/board_service.js";
import type { AuthedContext } from "../types/app.js";
import type {
  CreateBoardInput,
  UpdateBoardInput,
} from "../validators/boards.validator.js";
import type {
  AddBoardMemberInput,
  UpdateBoardMemberRoleInput,
} from "../validators/board_members.validator.js";

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

function parseOptionalId(param: string | undefined): number | undefined {
  const id = parseId(param);
  return id ?? undefined;
}

// GET /boards?workspaceId=&limit=&offset=
export async function listBoardsHandler(c: AuthedContext) {
  try {
    const workspaceId = parseOptionalId(c.req.query("workspaceId"));
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
    const offset = c.req.query("offset") ? Number(c.req.query("offset")) : undefined;
    const result = await listBoards(c.get("user"), { workspaceId, limit, offset });
    return c.json({ data: result.data, total: result.total }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// POST /boards — superadmin only (route enforces).
export async function createBoardHandler(c: AuthedContext) {
  try {
    const body = await validateReqPayload<CreateBoardInput>(
      "board:create",
      await readJsonBody(c),
      "Invalid board data"
    );
    const board = await createBoard(body, c.get("user").id);
    return c.json({ data: board }, StatusCodes.CREATED);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// GET /boards/:id — superadmin or board member (service enforces).
export async function getBoardHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const board = await getBoardById(id, c.get("user"));
    return c.json({ data: board }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// PATCH /boards/:id — superadmin only (route enforces).
export async function updateBoardHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const body = await validateReqPayload<UpdateBoardInput>(
      "board:update",
      await readJsonBody(c),
      "Invalid board data"
    );
    const board = await updateBoard(id, body);
    return c.json({ data: board }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// DELETE /boards/:id — superadmin only (route enforces).
export async function deleteBoardHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    await softDeleteBoard(id);
    return c.json({ message: "Board deleted" }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// POST /boards/:id/restore — superadmin only (route enforces).
export async function restoreBoardHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const board = await restoreBoard(id);
    return c.json({ data: board }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// GET /boards/:id/members — superadmin or board member (service enforces).
export async function listBoardMembersHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const members = await listBoardMembers(id, c.get("user"));
    return c.json({ data: members, total: members.length }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// POST /boards/:id/members — superadmin only (route enforces).
export async function addBoardMemberHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const body = await validateReqPayload<AddBoardMemberInput>(
      "board:add-member",
      { ...(await readJsonBody(c) as Record<string, unknown>), boardId: id },
      "Invalid member data"
    );
    const member = await addBoardMember(id, body);
    return c.json({ data: member }, StatusCodes.CREATED);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// PATCH /boards/:id/members/:userId — superadmin only (route enforces).
export async function updateBoardMemberRoleHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    const userId = parseId(c.req.param("userId"));
    if (!id || !userId) throw new BadRequestError("Invalid id");
    const body = await validateReqPayload<UpdateBoardMemberRoleInput>(
      "board:update-member-role",
      await readJsonBody(c),
      "Invalid member data"
    );
    const member = await updateBoardMemberRole(id, userId, body);
    return c.json({ data: member }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// DELETE /boards/:id/members/:userId — superadmin only (route enforces).
export async function removeBoardMemberHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    const userId = parseId(c.req.param("userId"));
    if (!id || !userId) throw new BadRequestError("Invalid id");
    await removeBoardMember(id, userId);
    return c.json({ message: "Board member removed" }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}
