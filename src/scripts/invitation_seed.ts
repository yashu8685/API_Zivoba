import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { workspaces } from "../db/schema/workspaces.js";
import { invitations } from "../db/schema/invitations.js";
import { sendInvitationSchema } from "../validators/invitations.validator.js";

const SUPERADMIN_EMAIL = "admin@zivoba.com";

// Fixed demo tokens keep reruns idempotent (token.unique()).
const demoInvitations = [
  {
    workspaceSlug: "actanos-engineering",
    email: "new.hire@zivoba.com",
    role: "member" as const,
    token: "demo-invite-actanos-001",
    accepted: false,
  },
  {
    workspaceSlug: "actanos-engineering",
    email: "contractor@zivoba.com",
    role: "member" as const,
    token: "demo-invite-actanos-002",
    accepted: false,
  },
  {
    workspaceSlug: "product-design",
    email: "designer.new@zivoba.com",
    role: "member" as const,
    token: "demo-invite-design-001",
    accepted: false,
  },
  {
    workspaceSlug: "product-design",
    email: "intern@zivoba.com",
    role: "member" as const,
    token: "demo-invite-design-002",
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

    const input = sendInvitationSchema.parse({
      workspaceId,
      email: inv.email,
      role: inv.role,
    });

    const existing = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(and(eq(invitations.workspaceId, workspaceId), eq(invitations.email, input.email)))
      .limit(1);
    if (existing.length > 0) {
      console.log(`Invitation skipped: ${inv.email} already invited to ${inv.workspaceSlug}`);
      continue;
    }

    const now = new Date();
    await db.insert(invitations).values({
      workspaceId,
      email: input.email,
      role: input.role ?? "member",
      token: inv.token,
      invitedBy: superadminId,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: inv.accepted ? now : null,
    });
    console.log(`Invited ${inv.email} to ${inv.workspaceSlug}${inv.accepted ? " (accepted)" : ""}`);
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
