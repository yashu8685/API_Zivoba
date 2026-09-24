// Validators for cards table (src/db/schema/cards.ts).
// createdBy / createdAt / updatedAt / deletedAt are server-generated.
import { z } from "zod";
import { cardPrioritySchema } from "./enums.validator.js";
import { createSlug } from "./slug.validator.js";

const titleSchema = z.string().trim().min(1).max(255);
const descriptionSchema = z.string().trim().max(10000).optional();
const dueDateSchema = z.string().date().optional();
const positionSchema = z.number().int().min(0);
// Optional slug override; server generates from title if omitted.
const slugSchema = createSlug(255);

// POST /cards — listId cascade (cards.ts:11-13).
export const createCardSchema = z.object({
  listId: z.number().int().positive(),
  title: titleSchema,
  slug: slugSchema.optional(),
  description: descriptionSchema,
  priority: cardPrioritySchema.default("medium"),
  dueDate: dueDateSchema,
  position: positionSchema.default(0),
});

// PATCH /cards/:id — includes move (listId + position).
export const updateCardSchema = z
  .object({
    title: titleSchema.optional(),
    slug: slugSchema.optional(),
    description: descriptionSchema.nullable().optional(),
    priority: cardPrioritySchema.optional(),
    dueDate: dueDateSchema.nullable().optional(),
    listId: z.number().int().positive().optional(),
    position: positionSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
