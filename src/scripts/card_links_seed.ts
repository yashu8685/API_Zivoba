import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { workspaces } from "../db/schema/workspaces.js";
import { boards } from "../db/schema/boards.js";
import { lists } from "../db/schema/lists.js";
import { cards } from "../db/schema/cards.js";
import { labels } from "../db/schema/labels.js";
import { cardAssignees } from "../db/schema/card_assignees.js";
import { cardLabels } from "../db/schema/card_labels.js";
import { assignUserSchema } from "../validators/card_assignees.validator.js";
import { addCardLabelSchema } from "../validators/card_labels.validator.js";

// Board members mirror board_seed.ts demoBoards.
const boardConfigs = [
  {
    workspaceSlug: "actanos-engineering",
    boardSlug: "backend-sprint",
    members: [
      "aarav.sharma@zivoba.com",
      "rahul.verma@zivoba.com",
      "sneha.reddy@zivoba.com",
    ],
    defaultLabel: "backend",
  },
  {
    workspaceSlug: "actanos-engineering",
    boardSlug: "frontend-sprint",
    members: ["priya.patel@zivoba.com", "arjun.mehta@zivoba.com"],
    defaultLabel: "frontend",
  },
  {
    workspaceSlug: "product-design",
    boardSlug: "ui-revamp",
    members: [
      "kavya.nair@zivoba.com",
      "vikram.singh@zivoba.com",
      "ananya.iyer@zivoba.com",
    ],
    defaultLabel: "design",
  },
  {
    workspaceSlug: "product-design",
    boardSlug: "ux-research",
    members: ["rohan.gupta@zivoba.com", "divya.menon@zivoba.com"],
    defaultLabel: "research",
  },
] as const;

async function getWorkspaceId(slug: string) {
  const rows = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  return rows[0]?.id;
}

async function getBoardId(workspaceId: number, boardSlug: string) {
  const rows = await db
    .select({ id: boards.id })
    .from(boards)
    .where(and(eq(boards.workspaceId, workspaceId), eq(boards.slug, boardSlug)))
    .limit(1);
  return rows[0]?.id;
}

async function getLabelId(workspaceId: number, labelSlug: string) {
  const rows = await db
    .select({ id: labels.id })
    .from(labels)
    .where(and(eq(labels.workspaceId, workspaceId), eq(labels.slug, labelSlug)))
    .limit(1);
  return rows[0]?.id;
}

async function ensureAssignee(cardId: number, userId: number) {
  const input = assignUserSchema.parse({ cardId, userId });
  const existing = await db
    .select({ id: cardAssignees.id })
    .from(cardAssignees)
    .where(
      and(eq(cardAssignees.cardId, input.cardId), eq(cardAssignees.userId, input.userId))
    )
    .limit(1);
  if (existing.length > 0) return false;
  await db.insert(cardAssignees).values({ cardId: input.cardId, userId: input.userId });
  return true;
}

async function ensureCardLabel(cardId: number, labelId: number) {
  const input = addCardLabelSchema.parse({ cardId, labelId });
  const existing = await db
    .select({ id: cardLabels.id })
    .from(cardLabels)
    .where(and(eq(cardLabels.cardId, input.cardId), eq(cardLabels.labelId, input.labelId)))
    .limit(1);
  if (existing.length > 0) return false;
  await db.insert(cardLabels).values({ cardId: input.cardId, labelId: input.labelId });
  return true;
}

async function seedCardLinks() {
  for (const b of boardConfigs) {
    const workspaceId = await getWorkspaceId(b.workspaceSlug);
    if (!workspaceId) throw new Error(`Workspace ${b.workspaceSlug} not found.`);
    const boardId = await getBoardId(workspaceId, b.boardSlug);
    if (!boardId) throw new Error(`Board ${b.boardSlug} not found. Run board_seed.ts first.`);

    const defaultLabelId = await getLabelId(workspaceId, b.defaultLabel);
    if (!defaultLabelId) {
      throw new Error(`Label ${b.defaultLabel} not found. Run label_seed.ts first.`);
    }
    const urgentLabelId = await getLabelId(
      workspaceId,
      b.workspaceSlug === "actanos-engineering" ? "urgent" : "bug"
    );

    // Resolve member ids once per board.
    const memberIds: number[] = [];
    for (const email of b.members) {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      const id = rows[0]?.id;
      if (!id) {
        console.log(`  assignee skipped: ${email} not found`);
        continue;
      }
      memberIds.push(id);
    }
    if (memberIds.length === 0) throw new Error(`No members found for ${b.boardSlug}`);

    // All cards in this board, ordered for stable round-robin.
    const boardLists = await db
      .select({ id: lists.id })
      .from(lists)
      .where(eq(lists.boardId, boardId));
    if (boardLists.length === 0) throw new Error(`No lists in ${b.boardSlug}. Run list_seed.ts first.`);

    let assigneesAdded = 0;
    let labelsAdded = 0;
    let cardIndex = 0;

    for (const l of boardLists) {
      const boardCards = await db
        .select({ id: cards.id, priority: cards.priority })
        .from(cards)
        .where(eq(cards.listId, l.id))
        .orderBy(cards.position);

      for (const c of boardCards) {
        // Round-robin 1 assignee per card.
        const userId = memberIds[cardIndex % memberIds.length]!;
        if (await ensureAssignee(c.id, userId)) assigneesAdded++;

        // Default workspace label on every card.
        if (await ensureCardLabel(c.id, defaultLabelId)) labelsAdded++;

        // High/urgent priority gets Urgent (eng) or Bug (design) extra label.
        if ((c.priority === "high" || c.priority === "urgent") && urgentLabelId) {
          if (await ensureCardLabel(c.id, urgentLabelId)) labelsAdded++;
        }
        cardIndex++;
      }
    }
    console.log(
      `Card links: ${assigneesAdded} assignees, ${labelsAdded} labels added in ${b.boardSlug}`
    );
  }
}

try {
  await seedCardLinks();
} catch (err) {
  console.error("Card links seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
