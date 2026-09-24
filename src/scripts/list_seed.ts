import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { workspaces } from "../db/schema/workspaces.js";
import { boards } from "../db/schema/boards.js";
import { lists } from "../db/schema/lists.js";
import { createListSchema } from "../validators/lists.validator.js";

function slugify(name: string, max = 150): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

const demoLists = [
  {
    workspaceSlug: "actanos-engineering",
    boardSlug: "backend-sprint",
    titles: ["Backlog", "To Do", "In Progress", "Done"],
  },
  {
    workspaceSlug: "actanos-engineering",
    boardSlug: "frontend-sprint",
    titles: ["Backlog", "To Do", "In Progress", "Done"],
  },
  {
    workspaceSlug: "product-design",
    boardSlug: "ui-revamp",
    titles: ["Backlog", "To Do", "In Progress", "Done"],
  },
  {
    workspaceSlug: "product-design",
    boardSlug: "ux-research",
    titles: ["Backlog", "To Do", "In Progress", "Done"],
  },
] as const;

async function getBoardId(workspaceSlug: string, boardSlug: string) {
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
  return boardRows[0]?.id;
}

async function seedLists() {
  for (const b of demoLists) {
    const boardId = await getBoardId(b.workspaceSlug, b.boardSlug);
    if (!boardId) {
      throw new Error(
        `Board ${b.boardSlug} in ${b.workspaceSlug} not found. Run board_seed.ts first.`
      );
    }

    let added = 0;
    for (let i = 0; i < b.titles.length; i++) {
      const title = b.titles[i]!;
      const slug = slugify(title);

      const input = createListSchema.parse({
        boardId,
        title,
        slug,
        position: i,
      });

      const existing = await db
        .select({ id: lists.id })
        .from(lists)
        .where(and(eq(lists.boardId, boardId), eq(lists.slug, input.slug ?? slug)))
        .limit(1);

      if (existing.length > 0) {
        console.log(`List skipped: ${title} already exists in ${b.boardSlug}`);
        continue;
      }

      await db.insert(lists).values({
        boardId,
        title: input.title,
        slug: input.slug ?? slug,
        position: input.position ?? i,
      });
      added++;
    }
    console.log(`Lists: ${added} added to ${b.boardSlug}`);
  }
}

try {
  await seedLists();
} catch (err) {
  console.error("List seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
