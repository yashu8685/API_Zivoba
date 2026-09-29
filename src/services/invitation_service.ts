import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { boards } from "../db/schema/boards.js";
import { boardMembers } from "../db/schema/board_members.js";
import { invitations, type Invitation } from "../db/schema/invitations.js";
import { users } from "../db/schema/users.js";
import {
  ensureRosterMember,
  isBoardMember,
} from "../validations/custom-validations.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../exceptions/index.js";
import type {
  AcceptInvitationInput,
  SendInvitationInput,
} from "../validators/invitations.validator.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function requireLiveBoard(boardId: number) {
  const rows = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1);
  const board = rows[0];
  if (!board || board.deletedAt) throw new NotFoundError("Board not found");
  return board;
}

async function uniqueToken(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const token = randomBytes(32).toString("hex");
    const rows = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);
    if (rows.length === 0) return token;
  }
  throw new BadRequestError("Could not generate invitation token");
}

// ─── Send (superadmin only — route enforces) ────────────────────────────────
export async function sendInvitation(input: SendInvitationInput, invitedBy: number): Promise<Invitation> {
  await requireLiveBoard(input.boardId);

  const userRows = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  const user = userRows[0];
  if (user && (await isBoardMember(input.boardId, user.id))) {
    throw new ConflictError("User is already a board member");
  }

  const pending = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(and(eq(invitations.boardId, input.boardId), eq(invitations.email, input.email)))
    .limit(1);
  if (pending.length > 0) throw new ConflictError("Invitation already pending for this email");

  const inserted = await db
    .insert(invitations)
    .values({
      boardId: input.boardId,
      email: input.email,
      role: input.role,
      token: await uniqueToken(),
      invitedBy,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    })
    .returning();
  const invitation = inserted[0];
  if (!invitation) throw new BadRequestError("Failed to create invitation");
  return invitation;
}

// ─── List board invites (superadmin only — route enforces) ─────────────────
export async function listInvitations(boardId: number): Promise<Invitation[]> {
  await requireLiveBoard(boardId);
  return db.select().from(invitations).where(eq(invitations.boardId, boardId));
}

// ─── Accept (any logged-in user, but invite email must match account) ───────
export async function acceptInvitation(
  input: AcceptInvitationInput,
  viewer: { id: number; email: string }
): Promise<{ boardId: number; role: Invitation["role"] }> {
  const rows = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, input.token))
    .limit(1);
  const invitation = rows[0];
  if (!invitation) throw new NotFoundError("Invalid invitation");
  if (invitation.acceptedAt) throw new BadRequestError("Invitation already accepted");
  if (invitation.expiresAt.getTime() < Date.now()) {
    await db.delete(invitations).where(eq(invitations.id, invitation.id));
    throw new BadRequestError("Invitation expired");
  }
  if (viewer.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new ForbiddenError("Invitation was sent to a different email");
  }

  const boardRows = await db.select().from(boards).where(eq(boards.id, invitation.boardId)).limit(1);
  const board = boardRows[0];
  if (!board || board.deletedAt) {
    await db.delete(invitations).where(eq(invitations.id, invitation.id));
    throw new NotFoundError("Board no longer exists");
  }

  if (!(await isBoardMember(board.id, viewer.id))) {
    await db
      .insert(boardMembers)
      .values({ boardId: board.id, userId: viewer.id, role: invitation.role });
  }
  await ensureRosterMember(board.workspaceId, viewer.id, invitation.role);
  await db.delete(invitations).where(eq(invitations.id, invitation.id));
  return { boardId: board.id, role: invitation.role };
}
