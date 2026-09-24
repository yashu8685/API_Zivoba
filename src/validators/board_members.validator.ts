// Validators for board_members table (src/db/schema/board_members.ts).
// joinedAt server-generated; (boardId, userId) unique.
import { z } from "zod";
import { workspaceRoleSchema } from "./enums.validator.js";

// POST /boards/:id/members — add user with role.
export const addBoardMemberSchema = z.object({
  boardId: z.number().int().positive(),
  userId: z.number().int().positive(),
  role: workspaceRoleSchema.default("member"),
});

// PATCH /boards/:boardId/members/:userId — role change only.
export const updateBoardMemberRoleSchema = z.object({
  role: workspaceRoleSchema,
});

export type AddBoardMemberInput = z.infer<typeof addBoardMemberSchema>;
export type UpdateBoardMemberRoleInput = z.infer<typeof updateBoardMemberRoleSchema>;
