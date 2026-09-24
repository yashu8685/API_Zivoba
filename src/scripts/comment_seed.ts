import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { cards } from "../db/schema/cards.js";
import { comments } from "../db/schema/comments.js";
import { createCommentSchema } from "../validators/comments.validator.js";

// cardSlug -> comments. Authors are board members (see board_seed.ts).
const demoComments: Record<string, { email: string; content: string }[]> = {
  "setup-auth-middleware": [
    { email: "aarav.sharma@zivoba.com", content: "Started JWT verify, will push WIP today." },
    { email: "rahul.verma@zivoba.com", content: "Check token expiry edge case before merge." },
  ],
  "implement-workspace-crud": [
    { email: "sneha.reddy@zivoba.com", content: "Routes drafted, adding zod validation next." },
  ],
  "implement-list-crud": [
    { email: "aarav.sharma@zivoba.com", content: "Reorder endpoint needs atomic position update." },
  ],
  "login-page": [
    { email: "priya.patel@zivoba.com", content: "Form done, wiring error states now." },
    { email: "arjun.mehta@zivoba.com", content: "Added loading spinner for submit." },
  ],
  "board-view": [
    { email: "priya.patel@zivoba.com", content: "Horizontal scroll works, drag-drop next." },
  ],
  "new-card-modal-mock": [
    { email: "kavya.nair@zivoba.com", content: "Figma v2 ready for review." },
    { email: "vikram.singh@zivoba.com", content: "Left comments on spacing." },
  ],
  "usability-tests-round-1": [
    { email: "rohan.gupta@zivoba.com", content: "2 sessions done, 3 more scheduled." },
  ],
  "board-empty-states": [
    { email: "ananya.iyer@zivoba.com", content: "Illustrations exported." },
  ],
};

async function seedComments() {
  for (const [cardSlug, items] of Object.entries(demoComments)) {
    const cardRows = await db
      .select({ id: cards.id })
      .from(cards)
      .where(eq(cards.slug, cardSlug))
      .limit(1);
    const cardId = cardRows[0]?.id;
    if (!cardId) throw new Error(`Card ${cardSlug} not found. Run card_seed.ts first.`);

    let added = 0;
    for (const item of items) {
      const userRows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, item.email))
        .limit(1);
      const userId = userRows[0]?.id;
      if (!userId) {
        console.log(`  comment skipped: ${item.email} not found`);
        continue;
      }

      const input = createCommentSchema.parse({ cardId, content: item.content });

      const existing = await db
        .select({ id: comments.id })
        .from(comments)
        .where(
          and(
            eq(comments.cardId, cardId),
            eq(comments.userId, userId),
            eq(comments.content, input.content)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(`Comment skipped: already exists in ${cardSlug}`);
        continue;
      }

      await db.insert(comments).values({ cardId, userId, content: input.content });
      added++;
    }
    console.log(`Comments: ${added} added to ${cardSlug}`);
  }
}

try {
  await seedComments();
} catch (err) {
  console.error("Comment seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
