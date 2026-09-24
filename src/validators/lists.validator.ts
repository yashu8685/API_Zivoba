// Validators for lists table (src/db/schema/lists.ts).
import { z } from "zod";
import { createSlug } from "./slug.validator.js";

const titleSchema = z.string().trim().min(1).max(150);
const positionSchema = z.number().int().min(0);
// Optional slug override; server generates from title if omitted.
const slugSchema = createSlug(150);

// POST /lists — boardId cascade (lists.ts:9-11).
export const createListSchema = z.object({
  boardId: z.number().int().positive(),
  title: titleSchema,
  slug: slugSchema.optional(),
  position: positionSchema.default(0),
});

// PATCH /lists/:id
export const updateListSchema = z
  .object({
    title: titleSchema.optional(),
    slug: slugSchema.optional(),
    position: positionSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

// PATCH /boards/:id/lists/reorder — drag-drop bulk position update.
export const reorderListsSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1).max(500),
});

export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
export type ReorderListsInput = z.infer<typeof reorderListsSchema>;
