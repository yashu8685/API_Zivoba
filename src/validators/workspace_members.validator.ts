// Validators for workspace_members table (src/db/schema/workspace_members.ts).
// joinedAt server-generated; (workspaceId, userId) unique.
import { z } from "zod";
import { workspaceRoleSchema } from "./enums.validator.js";

const workspaceIdSchema = z.number().int().positive();
const userIdSchema = z.number().int().positive();

// POST /workspaces/:id/members — add user with role.
export const addWorkspaceMemberSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: userIdSchema,
  role: workspaceRoleSchema.default("member"),
});

// PATCH /workspaces/:workspaceId/members/:userId — role change only.
export const updateWorkspaceMemberRoleSchema = z.object({
  role: workspaceRoleSchema,
});

export type AddWorkspaceMemberInput = z.infer<typeof addWorkspaceMemberSchema>;
export type UpdateWorkspaceMemberRoleInput = z.infer<typeof updateWorkspaceMemberRoleSchema>;
