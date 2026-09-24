// Validators for comments table (src/db/schema/comments.ts).
// userId from auth session (restrict); soft delete.
import { z } from "zod";

const contentSchema = z.string().trim().min(1).max(5000);

// POST /cards/:id/comments
export const createCommentSchema = z.object({
  cardId: z.number().int().positive(),
  content: contentSchema,
});

// PATCH /comments/:id — author edits content only.
export const updateCommentSchema = z.object({
  content: contentSchema,
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
