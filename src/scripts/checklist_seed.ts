import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { cards } from "../db/schema/cards.js";
import { checklists } from "../db/schema/checklists.js";
import { createChecklistSchema } from "../validators/checklists.validator.js";

function slugify(name: string, max = 150): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

// cardSlug -> checklist titles. One by one: checklists first, items next.
const demoChecklists: Record<string, string[]> = {
  "setup-auth-middleware": ["Auth implementation", "Test coverage"],
  "implement-workspace-crud": ["Workspace API"],
  "implement-list-crud": ["List API"],
  "login-page": ["Login UI"],
  "board-view": ["Board UI", "QA pass"],
  "new-card-modal-mock": ["Design review"],
  "usability-tests-round-1": ["Test session"],
  "implement-board-crud": ["Board API"],
};

async function seedChecklists() {
  for (const [cardSlug, titles] of Object.entries(demoChecklists)) {
    const cardRows = await db
      .select({ id: cards.id })
      .from(cards)
      .where(eq(cards.slug, cardSlug))
      .limit(1);
    const cardId = cardRows[0]?.id;
    if (!cardId) {
      throw new Error(`Card ${cardSlug} not found. Run card_seed.ts first.`);
    }

    let added = 0;
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i]!;
      const slug = slugify(title);
      const input = createChecklistSchema.parse({ cardId, title, slug, position: i });

      const existing = await db
        .select({ id: checklists.id })
        .from(checklists)
        .where(and(eq(checklists.cardId, cardId), eq(checklists.slug, input.slug ?? slug)))
        .limit(1);

      if (existing.length > 0) {
        console.log(`Checklist skipped: ${title} already exists in ${cardSlug}`);
        continue;
      }

      await db.insert(checklists).values({
        cardId,
        title: input.title,
        slug: input.slug ?? slug,
        position: input.position ?? i,
      });
      added++;
    }
    console.log(`Checklists: ${added} added to ${cardSlug}`);
  }
}

try {
  await seedChecklists();
} catch (err) {
  console.error("Checklist seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
