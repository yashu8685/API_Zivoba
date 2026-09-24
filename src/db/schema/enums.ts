import { pgEnum } from "drizzle-orm/pg-core";

// System-level roles (users.role) — enforced at DB level.
export const systemRoleEnum = pgEnum("system_role", ["superadmin", "user"]);

// Workspace / board membership roles
export const workspaceRoleEnum = pgEnum("workspace_role", ["owner", "admin", "member"]);

// Card / issue priorities
export const cardPriorityEnum = pgEnum("card_priority", ["low", "medium", "high", "urgent"]);

// Issue lifecycle
export const issueStatusEnum = pgEnum("issue_status", ["open", "in_progress", "resolved", "closed"]);

// Notification categories
export const notificationTypeEnum = pgEnum("notification_type", [
  "info",
  "mention",
  "assigned",
  "comment",
  "issue",
  "invitation",
]);
