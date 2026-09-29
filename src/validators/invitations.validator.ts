// Validators for invitations table (src/db/schema/invitations.ts).
// token / invitedBy / expiresAt / acceptedAt / createdAt are server-generated.
import { z } from "zod";
import { workspaceRoleSchema } from "./enums.validator.js";

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const tokenSchema = z.string().trim().min(1).max(512);

// POST /boards/:id/invitations — client sends email + role only, board from path.
export const sendInvitationSchema = z.object({
  boardId: z.number().int().positive(),
  email: emailSchema,
  role: workspaceRoleSchema.default("member"),
});

// POST /invitations/accept — token lookup (token.unique() covers index).
export const acceptInvitationSchema = z.object({
  token: tokenSchema,
});

export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
