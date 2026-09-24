import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { workspaces } from "../db/schema/workspaces.js";
import { boards } from "../db/schema/boards.js";
import { boardMembers } from "../db/schema/board_members.js";
import { createBoardSchema } from "../validators/boards.validator.js";

function slugify(name: string, max = 150): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

// ─── Project rule ────────────────────────────────────────────────────
// Superadmin creates all boards (createdBy = superadmin id) and is the
// board "owner". Assigned users are "member" and can do whatever they
// want inside the board (lists, cards, etc.).
const SUPERADMIN_EMAIL = "admin@zivoba.com";

const demoBoards = [
  {
    workspaceSlug: "actanos-engineering",
    name: "Backend Sprint",
    description: "Backend tasks for current sprint",
    members: [
      "aarav.sharma@zivoba.com",
      "rahul.verma@zivoba.com",
      "sneha.reddy@zivoba.com",
    ],
  },
  {
    workspaceSlug: "actanos-engineering",
    name: "Frontend Sprint",
    description: "Frontend tasks for current sprint",
    members: ["priya.patel@zivoba.com", "arjun.mehta@zivoba.com"],
  },
  {
    workspaceSlug: "product-design",
    name: "UI Revamp",
    description: "UI revamp tasks",
    members: ["kavya.nair@zivoba.com", "vikram.singh@zivoba.com", "ananya.iyer@zivoba.com"],
  },
  {
    workspaceSlug: "product-design",
    name: "UX Research",
    description: "UX research tasks",
    members: ["rohan.gupta@zivoba.com", "divya.menon@zivoba.com"],
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

async function getWorkspaceIdBySlug(slug: string) {
  const rows = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  return rows[0]?.id;
}

async function ensureBoardMember(boardId: number, userId: number, role: "owner" | "admin" | "member") {
  const existing = await db
    .select({ id: boardMembers.id })
    .from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)))
    .limit(1);
  if (existing.length > 0) return false;
  await db.insert(boardMembers).values({ boardId, userId, role });
  return true;
}

async function seedBoards() {
  const superadminId = await getUserIdByEmail(SUPERADMIN_EMAIL);
  if (!superadminId) {
    throw new Error(`Superadmin ${SUPERADMIN_EMAIL} not found. Run user_seed.ts first.`);
  }

  for (const b of demoBoards) {
    const workspaceId = await getWorkspaceIdBySlug(b.workspaceSlug);
    if (!workspaceId) {
      throw new Error(
        `Workspace ${b.workspaceSlug} not found. Run workspace_seed.ts first.`
      );
    }

    const slug = slugify(b.name);
    const input = createBoardSchema.parse({
      workspaceId,
      name: b.name,
      slug,
      description: b.description,
    });

    let boardId: number;
    const existing = await db
      .select({ id: boards.id })
      .from(boards)
      .where(and(eq(boards.workspaceId, workspaceId), eq(boards.slug, input.slug ?? slug)))
      .limit(1);

    if (existing.length > 0) {
      boardId = existing[0]!.id;
      console.log(`Board skipped: ${b.name} already exists`);
    } else {
      const inserted = await db
        .insert(boards)
        .values({
          workspaceId,
          name: input.name,
          slug: input.slug ?? slug,
          description: input.description,
          createdBy: superadminId,
        })
        .returning({ id: boards.id });
      boardId = inserted[0]!.id;
      console.log(`Seeded board: ${b.name} in ${b.workspaceSlug} (createdBy superadmin)`);
    }

    await ensureBoardMember(boardId, superadminId, "owner");

    let added = 0;
    for (const email of b.members) {
      const userId = await getUserIdByEmail(email);
      if (!userId) {
        console.log(`  member skipped: ${email} not found`);
        continue;
      }
      if (await ensureBoardMember(boardId, userId, "member")) added++;
    }
    console.log(`  members: ${added} added to ${b.name}`);
  }
}

try {
  await seedBoards();
} catch (err) {
  console.error("Board seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
