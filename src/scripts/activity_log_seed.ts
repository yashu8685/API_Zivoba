import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { workspaces } from "../db/schema/workspaces.js";
import { boards } from "../db/schema/boards.js";
import { cards } from "../db/schema/cards.js";
import { activityLog } from "../db/schema/activity_log.js";

type DemoActivity = {
  actorEmail: string;
  workspaceSlug?: string;
  boardSlug?: string;
  cardSlug?: string;
  action: string;
};

const demoActivity: DemoActivity[] = [
  { actorEmail: "admin@zivoba.com", workspaceSlug: "actanos-engineering", action: "created workspace Actanos Engineering" },
  { actorEmail: "admin@zivoba.com", workspaceSlug: "product-design", action: "created workspace Product Design" },
  { actorEmail: "admin@zivoba.com", workspaceSlug: "actanos-engineering", boardSlug: "backend-sprint", action: "created board Backend Sprint" },
  { actorEmail: "admin@zivoba.com", workspaceSlug: "actanos-engineering", boardSlug: "frontend-sprint", action: "created board Frontend Sprint" },
  { actorEmail: "aarav.sharma@zivoba.com", workspaceSlug: "actanos-engineering", boardSlug: "backend-sprint", cardSlug: "setup-auth-middleware", action: "moved Setup auth middleware to In Progress" },
  { actorEmail: "rahul.verma@zivoba.com", workspaceSlug: "actanos-engineering", boardSlug: "backend-sprint", cardSlug: "setup-auth-middleware", action: "commented on Setup auth middleware" },
  { actorEmail: "priya.patel@zivoba.com", workspaceSlug: "actanos-engineering", boardSlug: "frontend-sprint", cardSlug: "board-view", action: "moved Board view to In Progress" },
  { actorEmail: "kavya.nair@zivoba.com", workspaceSlug: "product-design", boardSlug: "ui-revamp", cardSlug: "new-card-modal-mock", action: "attached Figma link to New card modal mock" },
  { actorEmail: "rohan.gupta@zivoba.com", workspaceSlug: "product-design", boardSlug: "ux-research", cardSlug: "usability-tests-round-1", action: "started Usability tests round 1" },
  { actorEmail: "sneha.reddy@zivoba.com", workspaceSlug: "actanos-engineering", boardSlug: "backend-sprint", cardSlug: "implement-workspace-crud", action: "created checklist Workspace API" },
];

async function getId(table: "users" | "workspaces" | "boards" | "cards", key: string, parentId?: number) {
  if (table === "users") {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, key)).limit(1);
    return rows[0]?.id;
  }
  if (table === "workspaces") {
    const rows = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, key)).limit(1);
    return rows[0]?.id;
  }
  if (table === "boards") {
    const rows = await db
      .select({ id: boards.id })
      .from(boards)
      .where(and(eq(boards.workspaceId, parentId!), eq(boards.slug, key)))
      .limit(1);
    return rows[0]?.id;
  }
  const rows = await db.select({ id: cards.id }).from(cards).where(eq(cards.slug, key)).limit(1);
  return rows[0]?.id;
}

async function seedActivityLog() {
  let added = 0;
  for (const a of demoActivity) {
    const actorId = await getId("users", a.actorEmail);
    if (!actorId) {
      console.log(`  activity skipped: ${a.actorEmail} not found`);
      continue;
    }
    let workspaceId: number | undefined;
    let boardId: number | undefined;
    let cardId: number | undefined;

    if (a.workspaceSlug) {
      workspaceId = await getId("workspaces", a.workspaceSlug);
      if (!workspaceId) throw new Error(`Workspace ${a.workspaceSlug} not found.`);
    }
    if (a.boardSlug) {
      boardId = await getId("boards", a.boardSlug, workspaceId);
      if (!boardId) throw new Error(`Board ${a.boardSlug} not found.`);
    }
    if (a.cardSlug) {
      cardId = await getId("cards", a.cardSlug);
      if (!cardId) throw new Error(`Card ${a.cardSlug} not found.`);
    }

    const conditions = [eq(activityLog.action, a.action), eq(activityLog.actorId, actorId)];
    if (boardId) conditions.push(eq(activityLog.boardId, boardId));
    if (cardId) conditions.push(eq(activityLog.cardId, cardId));

    const existing = await db
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(and(...conditions))
      .limit(1);
    if (existing.length > 0) {
      console.log(`Activity skipped: "${a.action}" already logged`);
      continue;
    }

    await db.insert(activityLog).values({
      actorId,
      workspaceId,
      boardId,
      cardId,
      action: a.action,
    });
    added++;
  }
  console.log(`Activity log: ${added} added`);
}

try {
  await seedActivityLog();
} catch (err) {
  console.error("Activity log seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
