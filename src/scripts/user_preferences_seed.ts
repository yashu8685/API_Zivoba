import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { userPreferences } from "../db/schema/user_preferences.js";
import { upsertPreferencesSchema } from "../validators/user_preferences.validator.js";

// Demo variations — everyone else gets defaults (all true).
const overrides: Record<string, { mentions?: boolean; assignments?: boolean; comments?: boolean }> = {
  "rahul.verma@zivoba.com": { mentions: false },
  "kavya.nair@zivoba.com": { comments: false },
  "divya.menon@zivoba.com": { assignments: false, mentions: false },
};

async function seedPreferences() {
  const allUsers = await db.select({ id: users.id, email: users.email }).from(users);
  if (allUsers.length === 0) throw new Error("No users found. Run user_seed.ts first.");

  let added = 0;
  for (const u of allUsers) {
    const existing = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.userId, u.id))
      .limit(1);
    if (existing.length > 0) {
      console.log(`Preferences skipped: ${u.email} already exists`);
      continue;
    }

    const input = upsertPreferencesSchema.parse(overrides[u.email] ?? {});
    await db.insert(userPreferences).values({
      userId: u.id,
      mentions: input.mentions ?? true,
      assignments: input.assignments ?? true,
      comments: input.comments ?? true,
    });
    added++;
  }
  console.log(`Preferences: ${added} added`);
}

try {
  await seedPreferences();
} catch (err) {
  console.error("Preferences seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
