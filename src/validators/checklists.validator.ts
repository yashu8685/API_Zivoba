// Validators for checklists table (src/db/schema/checklists.ts).
import { z } from "zod";
import { createSlug } from "./slug.validator.js";

const titleSchema = z.string().trim().min(1).max(150);
const positionSchema = z.number().int().min(0);
// Optional slug override; server generates from title if omitted.
const slugSchema = createSlug(150);

// POST /checklists — cardId cascade (checklists.ts:10-12).
export const createChecklistSchema = z.object({
  cardId: z.number().int().positive(),
  title: titleSchema,
  slug: slugSchema.optional(),
  position: positionSchema.default(0),
});

// PATCH /checklists/:id
export const updateChecklistSchema = z
  .object({
    title: titleSchema.optional(),
    slug: slugSchema.optional(),
    position: positionSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;
export type UpdateChecklistInput = z.infer<typeof updateChecklistSchema>;
