import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { createUserSchema } from "../validators/users.validator.js";

// ─── Helpers (from helpers.ts) ─────────────────────────────────────────
function slugify(name: string, max = 100): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

// ─── Superadmin (from superadmin.seed.ts) ──────────────────────────────
// Only the superadmin seeds system-level identity:
// - the single superadmin account (admin@zivoba.com, role "superadmin")
// Regular users can never self-assign roles; only superadmin-created
// flows assign roles. Workspace/board/card work lives in user seeds.
const defaultSuperadmin = {
  name: "Admin",
  email: "admin@zivoba.com",
  role: "superadmin",
} as const;

async function seedSuperadmin() {
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const slug = slugify(defaultSuperadmin.name);

  const input = createUserSchema.parse({
    name: defaultSuperadmin.name,
    slug,
    email: defaultSuperadmin.email,
    password,
    role: defaultSuperadmin.role,
  });

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Seed skipped: ${input.email} already exists`);
    return;
  }

  await db.insert(users).values({
    name: input.name,
    slug: input.slug ?? slug,
    email: input.email,
    passwordHash: hashPassword(input.password),
    role: input.role,
  });

  console.log(`Seeded superadmin: ${input.email}`);
}

// ─── Demo users (from users.seed.ts) ───────────────────────────────────
// Regular users own all workspace-level work: workspaces, boards,
// lists, cards, comments, etc. This seeds user identities
// (role "user") and will later hold their demo workspace content.
// System/role management stays in seedSuperadmin above.
const demoUsers = [
  { name: "Aarav Sharma", email: "aarav.sharma@zivoba.com" },
  { name: "Priya Patel", email: "priya.patel@zivoba.com" },
  { name: "Rahul Verma", email: "rahul.verma@zivoba.com" },
  { name: "Sneha Reddy", email: "sneha.reddy@zivoba.com" },
  { name: "Arjun Mehta", email: "arjun.mehta@zivoba.com" },
  { name: "Kavya Nair", email: "kavya.nair@zivoba.com" },
  { name: "Vikram Singh", email: "vikram.singh@zivoba.com" },
  { name: "Ananya Iyer", email: "ananya.iyer@zivoba.com" },
  { name: "Rohan Gupta", email: "rohan.gupta@zivoba.com" },
  { name: "Divya Menon", email: "divya.menon@zivoba.com" },
] as const;

async function seedDemoUsers() {
  const password = process.env.SEED_USER_PASSWORD ?? "User123!";
  let created = 0;
  let skipped = 0;

  for (const u of demoUsers) {
    const slug = slugify(u.name);

    const input = createUserSchema.parse({
      name: u.name,
      slug,
      email: u.email,
      password,
      role: "user",
    });

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await db.insert(users).values({
      name: input.name,
      slug: input.slug ?? slug,
      email: input.email,
      passwordHash: hashPassword(input.password),
      role: input.role,
    });
    created++;
  }

  console.log(`Demo users: ${created} created, ${skipped} skipped`);
}

// ─── Orchestrator (from seed.ts) ───────────────────────────────────────
// Superadmin first (system identity), then users.
async function main() {
  await seedSuperadmin();
  await seedDemoUsers();
}

try {
  await main();
} catch (err) {
  console.error("Seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
