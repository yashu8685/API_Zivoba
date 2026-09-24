import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { workspaces } from "../db/schema/workspaces.js";
import { labels } from "../db/schema/labels.js";
import { createLabelSchema } from "../validators/labels.validator.js";

function slugify(name: string, max = 50): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

const demoLabels = [
  {
    workspaceSlug: "actanos-engineering",
    labels: [
      { name: "Backend", color: "#4F46E5" },
      { name: "Frontend", color: "#0EA5E9" },
      { name: "Bug", color: "#EF4444" },
      { name: "Urgent", color: "#F97316" },
    ],
  },
  {
    workspaceSlug: "product-design",
    labels: [
      { name: "Design", color: "#8B5CF6" },
      { name: "UX", color: "#EC4899" },
      { name: "Research", color: "#14B8A6" },
      { name: "Bug", color: "#EF4444" },
    ],
  },
] as const;

async function seedLabels() {
  for (const w of demoLabels) {
    const wsRows = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, w.workspaceSlug))
      .limit(1);
    const workspaceId = wsRows[0]?.id;
    if (!workspaceId) {
      throw new Error(`Workspace ${w.workspaceSlug} not found. Run workspace_seed.ts first.`);
    }

    let added = 0;
    for (const l of w.labels) {
      const slug = slugify(l.name);
      const input = createLabelSchema.parse({
        workspaceId,
        name: l.name,
        slug,
        color: l.color,
      });

      const existing = await db
        .select({ id: labels.id })
        .from(labels)
        .where(and(eq(labels.workspaceId, workspaceId), eq(labels.slug, input.slug ?? slug)))
        .limit(1);

      if (existing.length > 0) {
        console.log(`Label skipped: ${l.name} already exists in ${w.workspaceSlug}`);
        continue;
      }

      await db.insert(labels).values({
        workspaceId,
        name: input.name,
        slug: input.slug ?? slug,
        color: input.color,
      });
      added++;
    }
    console.log(`Labels: ${added} added to ${w.workspaceSlug}`);
  }
}

try {
  await seedLabels();
} catch (err) {
  console.error("Label seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
