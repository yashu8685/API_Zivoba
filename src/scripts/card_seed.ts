import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { workspaces } from "../db/schema/workspaces.js";
import { boards } from "../db/schema/boards.js";
import { lists } from "../db/schema/lists.js";
import { cards } from "../db/schema/cards.js";
import { createCardSchema } from "../validators/cards.validator.js";

function slugify(name: string, max = 255): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

// ─── Project rule ────────────────────────────────────────────────────
// Superadmin creates all cards (createdBy = superadmin id), same as
// workspaces/boards. Assignment lives in card_assignees (next seed).
const SUPERADMIN_EMAIL = "admin@zivoba.com";

type DemoCard = {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
};

const demoCards: Record<string, Record<string, DemoCard[]>> = {
  "actanos-engineering/backend-sprint": {
    backlog: [
      { title: "Setup auth middleware", description: "JWT session + role checks", priority: "high" },
      { title: "Design DB indexes", description: "Audit hot paths for missing indexes", priority: "medium" },
    ],
    "to-do": [
      { title: "Implement workspace CRUD", description: "Hono routes + zod validators", priority: "high" },
      { title: "Implement board CRUD", description: "Workspace-scoped boards", priority: "high" },
    ],
    "in-progress": [
      { title: "Implement list CRUD", description: "Board-scoped lists + reorder", priority: "high" },
    ],
    done: [
      { title: "Project scaffold", description: "Hono + Drizzle + Postgres setup", priority: "medium" },
      { title: "Drizzle schema", description: "All tables + relations", priority: "medium" },
    ],
  },
  "actanos-engineering/frontend-sprint": {
    backlog: [
      { title: "Design system tokens", description: "Colors, spacing, typography", priority: "medium" },
      { title: "Board drag-drop spike", description: "Evaluate dnd library", priority: "low" },
    ],
    "to-do": [
      { title: "Login page", description: "Email + password form", priority: "high" },
      { title: "Workspace sidebar", description: "List + switch workspaces", priority: "medium" },
    ],
    "in-progress": [
      { title: "Board view", description: "Lists + cards horizontal scroll", priority: "high" },
    ],
    done: [
      { title: "App scaffold", description: "Routing + layout shell", priority: "medium" },
    ],
  },
  "product-design/ui-revamp": {
    backlog: [
      { title: "Audit current UI", description: "Screenshot + pain points", priority: "medium" },
      { title: "Competitor review", description: "Trello, Linear, Notion boards", priority: "low" },
    ],
    "to-do": [
      { title: "New card modal mock", description: "Figma high-fi", priority: "high" },
      { title: "Dark mode palette", description: "Contrast-checked tokens", priority: "medium" },
    ],
    "in-progress": [
      { title: "Board empty states", description: "Illustrations + copy", priority: "medium" },
    ],
    done: [
      { title: "Wireframes v1", description: "Board + card flows", priority: "medium" },
    ],
  },
  "product-design/ux-research": {
    backlog: [
      { title: "Recruit test users", description: "5 devs + 5 designers", priority: "medium" },
      { title: "Draft interview script", description: "Board workflow questions", priority: "medium" },
    ],
    "to-do": [
      { title: "Card sorting study", description: "List vs tag mental models", priority: "high" },
    ],
    "in-progress": [
      { title: "Usability tests round 1", description: "Create board -> invite -> move card", priority: "high" },
    ],
    done: [
      { title: "Research plan", description: "Goals + timeline", priority: "low" },
    ],
  },
};

async function getListId(workspaceSlug: string, boardSlug: string, listSlug: string) {
  const wsRows = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);
  const workspaceId = wsRows[0]?.id;
  if (!workspaceId) return undefined;

  const boardRows = await db
    .select({ id: boards.id })
    .from(boards)
    .where(and(eq(boards.workspaceId, workspaceId), eq(boards.slug, boardSlug)))
    .limit(1);
  const boardId = boardRows[0]?.id;
  if (!boardId) return undefined;

  const listRows = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.boardId, boardId), eq(lists.slug, listSlug)))
    .limit(1);
  return listRows[0]?.id;
}

async function seedCards() {
  const adminRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, SUPERADMIN_EMAIL))
    .limit(1);
  const superadminId = adminRows[0]?.id;
  if (!superadminId) {
    throw new Error(`Superadmin ${SUPERADMIN_EMAIL} not found. Run user_seed.ts first.`);
  }

  for (const [key, listsMap] of Object.entries(demoCards)) {
    const [workspaceSlug, boardSlug] = key.split("/") as [string, string];
    for (const [listSlug, cardDefs] of Object.entries(listsMap)) {
      const listId = await getListId(workspaceSlug!, boardSlug!, listSlug);
      if (!listId) {
        throw new Error(
          `List ${listSlug} in ${boardSlug} not found. Run list_seed.ts first.`
        );
      }

      let added = 0;
      for (let i = 0; i < cardDefs.length; i++) {
        const c = cardDefs[i]!;
        const slug = slugify(c.title);

        const input = createCardSchema.parse({
          listId,
          title: c.title,
          slug,
          description: c.description,
          priority: c.priority ?? "medium",
          position: i,
        });

        const existing = await db
          .select({ id: cards.id })
          .from(cards)
          .where(and(eq(cards.listId, listId), eq(cards.slug, input.slug ?? slug)))
          .limit(1);

        if (existing.length > 0) {
          console.log(`Card skipped: ${c.title} already exists in ${boardSlug}/${listSlug}`);
          continue;
        }

        await db.insert(cards).values({
          listId,
          title: input.title,
          slug: input.slug ?? slug,
          description: input.description,
          priority: input.priority ?? "medium",
          position: input.position ?? i,
          createdBy: superadminId,
        });
        added++;
      }
      console.log(`Cards: ${added} added to ${boardSlug}/${listSlug}`);
    }
  }
}

try {
  await seedCards();
} catch (err) {
  console.error("Card seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
