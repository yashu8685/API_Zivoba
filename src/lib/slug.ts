// Slug helpers — mirrors src/scripts/user_seed.ts so seeds and API agree.
export function slugify(name: string, max = 100): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

// "my-board" -> "my-board-2", "my-board-2" -> "my-board-3" for dedupe loops.
export function bumpSlug(slug: string, max = 100): string {
  const m = /-(\d+)$/.exec(slug);
  const next = m ? `${slug.slice(0, slug.length - m[0].length)}-${Number(m[1]) + 1}` : `${slug}-2`;
  return next.slice(0, max);
}
