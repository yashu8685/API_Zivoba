import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { workspaces } from "../db/schema/workspaces.js";
import { boards } from "../db/schema/boards.js";
import { invitations } from "../db/schema/invitations.js";
import { sendInvitationSchema } from "../validators/invitations.validator.js";

const SUPERADMIN_EMAIL = "admin@zivoba.com";

// Board-level invites (superadmin invites user email to a board).
// Fixed demo tokens keep reruns idempotent (token.unique()).
const demoInvitations = [
  {
    workspaceSlug: "actanos-engineering",
    boardSlug: "backend-sprint",
    email: "new.hire@zivoba.com",
    role: "member" as const,
    token: "demo-invite-backend-001",
    accepted: false,
  },
  {
    workspaceSlug: "actanos-engineering",
    boardSlug: "frontend-sprint",
    email: "contractor@zivoba.com",
    role: "member" as const,
    token: "demo-invite-frontend-001",
    accepted: false,
  },
  {
    workspaceSlug: "product-design",
    boardSlug: "ui-revamp",
    email: "designer.new@zivoba.com",
    role: "member" as const,
    token: "demo-invite-uirevamp-001",
    accepted: false,
  },
  {
    workspaceSlug: "product-design",
    boardSlug: "ux-research",
    email: "intern@zivoba.com",
    role: "member" as const,
    token: "demo-invite-uxresearch-001",
    accepted: true,
  },
] as const;

async function seedInvitations() {
  const adminRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, SUPERADMIN_EMAIL))
    .limit(1);
  const superadminId = adminRows[0]?.id;
  if (!superadminId) throw new Error(`Superadmin ${SUPERADMIN_EMAIL} not found.`);

  for (const inv of demoInvitations) {
    const wsRows = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, inv.workspaceSlug))
      .limit(1);
    const workspaceId = wsRows[0]?.id;
    if (!workspaceId) throw new Error(`Workspace ${inv.workspaceSlug} not found.`);

    const boardRows = await db
      .select({ id: boards.id })
      .from(boards)
      .where(and(eq(boards.workspaceId, workspaceId), eq(boards.slug, inv.boardSlug)))
      .limit(1);
    const boardId = boardRows[0]?.id;
    if (!boardId) throw new Error(`Board ${inv.boardSlug} not found. Run board_seed.ts first.`);

    const input = sendInvitationSchema.parse({
      boardId,
      email: inv.email,
      role: inv.role,
    });

    const existing = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(and(eq(invitations.boardId, boardId), eq(invitations.email, input.email)))
      .limit(1);
    if (existing.length > 0) {
      console.log(`Invitation skipped: ${inv.email} already invited to ${inv.boardSlug}`);
      continue;
    }

    const now = new Date();
    await db.insert(invitations).values({
      boardId,
      email: input.email,
      role: input.role ?? "member",
      token: inv.token,
      invitedBy: superadminId,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: inv.accepted ? now : null,
    });
    console.log(`Invited ${inv.email} to ${inv.boardSlug}${inv.accepted ? " (accepted)" : ""}`);
  }
}

try {
  await seedInvitations();
} catch (err) {
  console.error("Invitation seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
