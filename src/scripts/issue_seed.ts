import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { cards } from "../db/schema/cards.js";
import { issues } from "../db/schema/issues.js";
import { createIssueSchema } from "../validators/issues.validator.js";

function slugify(name: string, max = 255): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

const SUPERADMIN_EMAIL = "admin@zivoba.com";

type DemoIssue = {
  title: string;
  description?: string;
  status?: "open" | "in_progress" | "resolved" | "closed";
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeEmail?: string;
};

const demoIssues: Record<string, DemoIssue[]> = {
  "setup-auth-middleware": [
    {
      title: "Token refresh fails on expiry",
      description: "Refresh returns 401 instead of new token",
      status: "open",
      priority: "high",
      assigneeEmail: "rahul.verma@zivoba.com",
    },
    {
      title: "Role check missing on board routes",
      description: "Member can access admin endpoint",
      status: "in_progress",
      priority: "urgent",
      assigneeEmail: "aarav.sharma@zivoba.com",
    },
  ],
  "board-view": [
    {
      title: "Cards overlap on narrow screens",
      description: "Flex wrap breaks below 768px",
      status: "open",
      priority: "medium",
      assigneeEmail: "priya.patel@zivoba.com",
    },
  ],
  "login-page": [
    {
      title: "Error message not shown on 401",
      description: "Form stays idle on wrong password",
      status: "resolved",
      priority: "medium",
      assigneeEmail: "arjun.mehta@zivoba.com",
    },
  ],
  "new-card-modal-mock": [
    {
      title: "Modal spacing off in dark mode",
      description: "Padding token mismatch",
      status: "open",
      priority: "low",
      assigneeEmail: "vikram.singh@zivoba.com",
    },
  ],
  "usability-tests-round-1": [
    {
      title: "Users confused by list reorder",
      description: "Drag handle not discoverable",
      status: "open",
      priority: "high",
      assigneeEmail: "divya.menon@zivoba.com",
    },
  ],
};

async function seedIssues() {
  const adminRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, SUPERADMIN_EMAIL))
    .limit(1);
  const superadminId = adminRows[0]?.id;
  if (!superadminId) throw new Error(`Superadmin ${SUPERADMIN_EMAIL} not found.`);

  for (const [cardSlug, items] of Object.entries(demoIssues)) {
    const cardRows = await db
      .select({ id: cards.id })
      .from(cards)
      .where(eq(cards.slug, cardSlug))
      .limit(1);
    const cardId = cardRows[0]?.id;
    if (!cardId) throw new Error(`Card ${cardSlug} not found. Run card_seed.ts first.`);

    let added = 0;
    for (const item of items) {
      const slug = slugify(item.title);
      let assignedTo: number | undefined;
      if (item.assigneeEmail) {
        const uRows = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, item.assigneeEmail))
          .limit(1);
        assignedTo = uRows[0]?.id;
        if (!assignedTo) {
          console.log(`  issue skipped assignee: ${item.assigneeEmail} not found`);
        }
      }

      const input = createIssueSchema.parse({
        cardId,
        title: item.title,
        slug,
        description: item.description,
        status: item.status ?? "open",
        priority: item.priority ?? "medium",
        assignedTo,
      });

      const existing = await db
        .select({ id: issues.id })
        .from(issues)
        .where(and(eq(issues.cardId, cardId), eq(issues.slug, input.slug ?? slug)))
        .limit(1);

      if (existing.length > 0) {
        console.log(`Issue skipped: ${item.title} already exists in ${cardSlug}`);
        continue;
      }

      await db.insert(issues).values({
        cardId,
        title: input.title,
        slug: input.slug ?? slug,
        description: input.description,
        status: input.status ?? "open",
        priority: input.priority ?? "medium",
        assignedTo: input.assignedTo,
        createdBy: superadminId,
      });
      added++;
    }
    console.log(`Issues: ${added} added to ${cardSlug}`);
  }
}

try {
  await seedIssues();
} catch (err) {
  console.error("Issue seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
