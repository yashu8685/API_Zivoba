import type { Context } from "hono";
import { BadRequestError, StatusCodes, toErrorResponse } from "../exceptions/index.js";
import { validateReqPayload } from "../validations/validate-req.js";
import {
  listWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  softDeleteWorkspace,
  restoreWorkspace,
  getWorkspaceMembers,
} from "../services/workspace_service.js";
import type { AuthedContext } from "../types/app.js";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "../validators/workspaces.validator.js";

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

// GET /workspaces?limit=&offset= — superadmin: all; users: roster workspaces.
export async function listWorkspacesHandler(c: AuthedContext) {
  try {
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
    const offset = c.req.query("offset") ? Number(c.req.query("offset")) : undefined;
    const result = await listWorkspaces(c.get("user"), { limit, offset });
    return c.json({ data: result.data, total: result.total }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// POST /workspaces — superadmin only (route enforces).
export async function createWorkspaceHandler(c: AuthedContext) {
  try {
    const body = await validateReqPayload<CreateWorkspaceInput>(
      "workspace:create",
      await readJsonBody(c),
      "Invalid workspace data"
    );
    const workspace = await createWorkspace(body, c.get("user").id);
    return c.json({ data: workspace }, StatusCodes.CREATED);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// GET /workspaces/:id — superadmin or roster member (service enforces).
export async function getWorkspaceHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const workspace = await getWorkspaceById(id, c.get("user"));
    return c.json({ data: workspace }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// PATCH /workspaces/:id — superadmin only (route enforces).
export async function updateWorkspaceHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const body = await validateReqPayload<UpdateWorkspaceInput>(
      "workspace:update",
      await readJsonBody(c),
      "Invalid workspace data"
    );
    const workspace = await updateWorkspace(id, body);
    return c.json({ data: workspace }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// DELETE /workspaces/:id — superadmin only (route enforces).
export async function deleteWorkspaceHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    await softDeleteWorkspace(id);
    return c.json({ message: "Workspace deleted" }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// POST /workspaces/:id/restore — superadmin only (route enforces).
export async function restoreWorkspaceHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const workspace = await restoreWorkspace(id);
    return c.json({ data: workspace }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// GET /workspaces/:id/members — roster view, superadmin or roster member.
export async function getWorkspaceMembersHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const members = await getWorkspaceMembers(id, c.get("user"));
    return c.json({ data: members, total: members.length }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}
