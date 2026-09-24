import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { cards } from "../db/schema/cards.js";
import { checklists } from "../db/schema/checklists.js";
import { checkItems } from "../db/schema/check_items.js";
import { createCheckItemSchema } from "../validators/check_items.validator.js";

// cardSlug -> checklistSlug -> items. Mirrors checklist_seed.ts.
const demoCheckItems: Record<string, Record<string, { text: string; done?: boolean }[]>> = {
  "setup-auth-middleware": {
    "auth-implementation": [
      { text: "Sign JWT on login" },
      { text: "Verify middleware on protected routes" },
      { text: "Role check owner/admin/member", done: true },
    ],
    "test-coverage": [
      { text: "Login happy path", done: true },
      { text: "Expired token rejected" },
    ],
  },
  "implement-workspace-crud": {
    "workspace-api": [
      { text: "POST /workspaces", done: true },
      { text: "GET /workspaces/:slug" },
      { text: "PATCH + soft delete" },
    ],
  },
  "implement-board-crud": {
    "board-api": [
      { text: "POST /boards", done: true },
      { text: "GET /boards by workspace" },
    ],
  },
  "implement-list-crud": {
    "list-api": [
      { text: "POST /lists" },
      { text: "Reorder endpoint" },
    ],
  },
  "login-page": {
    "login-ui": [
      { text: "Email + password form", done: true },
      { text: "Error + loading states" },
    ],
  },
  "board-view": {
    "board-ui": [
      { text: "Horizontal list scroll", done: true },
      { text: "Card drag-drop" },
    ],
    "qa-pass": [{ text: "Empty states verified" }],
  },
  "new-card-modal-mock": {
    "design-review": [
      { text: "Figma link attached", done: true },
      { text: "Approve with PM" },
    ],
  },
  "usability-tests-round-1": {
    "test-session": [
      { text: "Run 3 sessions" },
      { text: "Synthesize findings" },
    ],
  },
};

async function seedCheckItems() {
  for (const [cardSlug, listsMap] of Object.entries(demoCheckItems)) {
    const cardRows = await db
      .select({ id: cards.id })
      .from(cards)
      .where(eq(cards.slug, cardSlug))
      .limit(1);
    const cardId = cardRows[0]?.id;
    if (!cardId) throw new Error(`Card ${cardSlug} not found. Run card_seed.ts first.`);

    for (const [checklistSlug, items] of Object.entries(listsMap)) {
      const clRows = await db
        .select({ id: checklists.id })
        .from(checklists)
        .where(and(eq(checklists.cardId, cardId), eq(checklists.slug, checklistSlug)))
        .limit(1);
      const checklistId = clRows[0]?.id;
      if (!checklistId) {
        throw new Error(
          `Checklist ${checklistSlug} in ${cardSlug} not found. Run checklist_seed.ts first.`
        );
      }

      let added = 0;
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const input = createCheckItemSchema.parse({
          checklistId,
          text: item.text,
          done: item.done ?? false,
          position: i,
        });

        const existing = await db
          .select({ id: checkItems.id })
          .from(checkItems)
          .where(and(eq(checkItems.checklistId, checklistId), eq(checkItems.text, input.text)))
          .limit(1);

        if (existing.length > 0) {
          console.log(`Check item skipped: "${item.text}" already exists in ${checklistSlug}`);
          continue;
        }

        await db.insert(checkItems).values({
          checklistId,
          text: input.text,
          done: input.done ?? false,
          position: input.position ?? i,
        });
        added++;
      }
      console.log(`Check items: ${added} added to ${cardSlug}/${checklistSlug}`);
    }
  }
}

try {
  await seedCheckItems();
} catch (err) {
  console.error("Check item seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
