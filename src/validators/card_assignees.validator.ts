// Validators for card_assignees junction (src/db/schema/card_assignees.ts).
// assignedAt server-generated; (cardId, userId) unique; hard delete on unassign.
import { z } from "zod";

// POST /cards/:id/assignees
export const assignUserSchema = z.object({
  cardId: z.number().int().positive(),
  userId: z.number().int().positive(),
});

// DELETE /cards/:cardId/assignees/:userId — same shape.
export const unassignUserSchema = z.object({
  cardId: z.number().int().positive(),
  userId: z.number().int().positive(),
});

export type AssignUserInput = z.infer<typeof assignUserSchema>;
export type UnassignUserInput = z.infer<typeof unassignUserSchema>;
