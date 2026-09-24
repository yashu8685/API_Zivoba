import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { notifications } from "../db/schema/notifications.js";

const demoNotifications: Record<
  string,
  { type: "info" | "mention" | "assigned" | "comment" | "issue" | "invitation"; title: string; message: string; isRead?: boolean }[]
> = {
  "aarav.sharma@zivoba.com": [
    { type: "assigned", title: "Assigned to Setup auth middleware", message: "You were assigned in Backend Sprint", },
    { type: "mention", title: "Mentioned in Setup auth middleware", message: "rahul.verma mentioned you in a comment", isRead: true },
  ],
  "priya.patel@zivoba.com": [
    { type: "assigned", title: "Assigned to Board view", message: "You were assigned in Frontend Sprint" },
    { type: "comment", title: "New comment on Login page", message: "arjun.mehta commented: Added loading spinner" },
  ],
  "rahul.verma@zivoba.com": [
    { type: "issue", title: "Token refresh fails on expiry", message: "Issue opened in Setup auth middleware" },
  ],
  "kavya.nair@zivoba.com": [
    { type: "comment", title: "New comment on New card modal mock", message: "vikram.singh commented on spacing" },
  ],
  "rohan.gupta@zivoba.com": [
    { type: "info", title: "Welcome to Product Design", message: "You joined Product Design workspace", isRead: true },
  ],
};

async function seedNotifications() {
  for (const [email, items] of Object.entries(demoNotifications)) {
    const uRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const userId = uRows[0]?.id;
    if (!userId) {
      console.log(`  notification skipped: ${email} not found`);
      continue;
    }

    let added = 0;
    for (const n of items) {
      const existing = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.title, n.title),
            eq(notifications.message, n.message)
          )
        )
        .limit(1);
      if (existing.length > 0) {
        console.log(`Notification skipped: "${n.title}" already exists for ${email}`);
        continue;
      }
      await db.insert(notifications).values({
        userId,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead ?? false,
      });
      added++;
    }
    console.log(`Notifications: ${added} added for ${email}`);
  }
}

try {
  await seedNotifications();
} catch (err) {
  console.error("Notification seed failed:", err);
  process.exit(1);
} finally {
  await queryClient.end({ timeout: 5 });
}
