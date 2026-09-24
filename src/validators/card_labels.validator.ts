// Validators for card_labels junction (src/db/schema/card_labels.ts).
// (cardId, labelId) unique; hard delete on unlabel.
import { z } from "zod";

// POST /cards/:id/labels
export const addCardLabelSchema = z.object({
  cardId: z.number().int().positive(),
  labelId: z.number().int().positive(),
});

// DELETE /cards/:cardId/labels/:labelId — same shape.
export const removeCardLabelSchema = z.object({
  cardId: z.number().int().positive(),
  labelId: z.number().int().positive(),
});

export type AddCardLabelInput = z.infer<typeof addCardLabelSchema>;
export type RemoveCardLabelInput = z.infer<typeof removeCardLabelSchema>;
