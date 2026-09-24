import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { workspaces } from "../db/schema/workspaces.js";
import { workspaceMembers } from "../db/schema/workspace_members.js";
import { createWorkspaceSchema } from "../validators/workspaces.validator.js";

function slugify(name: string, max = 150): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

// ─── Project rule ────────────────────────────────────────────────────
// Superadmin creates all workspaces (createdBy = superadmin id) and is
// the workspace "owner". Regular users are assigned as "member".
const SUPERADMIN_EMAIL = "admin@zivoba.com";

const demoWorkspaces = [
  {
    name: "Actanos Engineering",
    description: "Engineering workspace for product development",
    members: [
      "aarav.sharma@zivoba.com",
      "priya.patel@zivoba.com",
      "rahul.verma@zivoba.com",
      "sneha.reddy@zivoba.com",
      "arjun.mehta@zivoba.com",
    ],
  },
  {
    name: "Product Design",
    description: "Design workspace for UI/UX work",
    members: [
      "kavya.nair@zivoba.com",
      "vikram.singh@zivoba.com",
      "ananya.iyer@zivoba.com",
      "rohan.gupta@zivoba.com",
      "divya.menon@zivoba.com",
    ],
  },
] as const;

async function getUserIdByEmail(email: string) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0]?.id;
}

async function ensureMember(workspaceId: number, userId: number, role: "owner" | "admin" | "member") {
  const existing = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);

  if (existing.length > 0) return false;

  await db.insert(workspaceMembers).values({ workspaceId, userId, role });
  return true;
}

async function seedWorkspaces() {
  const superadminId = await getUserIdByEmail(SUPERADMIN_EMAIL);
  if (!superadminId) {
    throw new Error(
      `Superadmin ${SUPERADMIN_EMAIL} not found. Run user_seed.ts first.`
    );
  }

  for (const w of demoWorkspaces) {
    const slug = slugify(w.name);

    const input = createWorkspaceSchema.parse({
      name: w.name,
      slug,
      description: w.description,
    });

    let workspaceId: number;
    const existing = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, input.slug ?? slug))
      .limit(1);

    if (existing.length > 0) {
      workspaceId = existing[0]!.id;
      console.log(`Workspace skipped: ${w.name} already exists`);
    } else {
      const inserted = await db
        .insert(workspaces)
        .values({
          name: input.name,
          slug: input.slug ?? slug,
          description: input.description,
          createdBy: superadminId,
        })
        .returning({ id: workspaces.id });
      workspaceId = inserted[0]!.id;
      console.log(`Seeded workspace: ${w.name} (createdBy superadmin)`);
    }

    // Superadmin is always the owner.
    await ensureMember(workspaceId, superadminId, "owner");

    // Assign regular users as members.
    let added = 0;
    for (const email of w.members) {
      const userId = await getUserIdByEmail(email);
      if (!userId) {
        console.log(`  member skipped: ${email} not found`);
        continue;
      }
      if (await ensureMember(workspaceId, userId, "member")) added++;
    }
    console.log(`  members: ${added} added to ${w.name}`);
  }
}

try {
  await seedWorkspaces();
} catch (err) {
  console.error("Workspace seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
