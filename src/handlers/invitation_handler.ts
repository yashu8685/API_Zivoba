import type { Context } from "hono";
import { BadRequestError, StatusCodes, toErrorResponse } from "../exceptions/index.js";
import { validateReqPayload } from "../validations/validate-req.js";
import {
  sendInvitation,
  listInvitations,
  acceptInvitation,
} from "../services/invitation_service.js";
import type { AuthedContext } from "../types/app.js";
import type {
  AcceptInvitationInput,
  SendInvitationInput,
} from "../validators/invitations.validator.js";

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

// GET /boards/:id/invitations — superadmin only (route enforces).
export async function listInvitationsHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const invitations = await listInvitations(id);
    return c.json({ data: invitations, total: invitations.length }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// POST /boards/:id/invitations — superadmin only (route enforces).
export async function sendInvitationHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const body = await validateReqPayload<SendInvitationInput>(
      "invitation:send",
      { ...(await readJsonBody(c) as Record<string, unknown>), boardId: id },
      "Invalid invitation data"
    );
    const invitation = await sendInvitation(body, c.get("user").id);
    return c.json({ data: invitation }, StatusCodes.CREATED);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// POST /invitations/accept — any logged-in user; invite email must match account.
export async function acceptInvitationHandler(c: AuthedContext) {
  try {
    const body = await validateReqPayload<AcceptInvitationInput>(
      "invitation:accept",
      await readJsonBody(c),
      "Invalid invitation data"
    );
    const result = await acceptInvitation(body, c.get("user"));
    return c.json({ data: result }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}
