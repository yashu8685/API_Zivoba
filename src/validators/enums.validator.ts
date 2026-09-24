// Zod mirrors of src/db/schema/enums.ts — keep values in sync with pgEnum.
import { z } from "zod";

export const systemRoleSchema = z.enum(["superadmin", "user"]);
export const workspaceRoleSchema = z.enum(["owner", "admin", "member"]);
export const cardPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const issueStatusSchema = z.enum(["open", "in_progress", "resolved", "closed"]);
export const notificationTypeSchema = z.enum([
  "info",
  "mention",
  "assigned",
  "comment",
  "issue",
  "invitation",
]);

export type SystemRole = z.infer<typeof systemRoleSchema>;
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type CardPriority = z.infer<typeof cardPrioritySchema>;
export type IssueStatus = z.infer<typeof issueStatusSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
