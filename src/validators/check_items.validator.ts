// Validators for check_items table (src/db/schema/check_items.ts).
import { z } from "zod";

const textSchema = z.string().trim().min(1).max(1000);
const positionSchema = z.number().int().min(0);

// POST /check-items — checklistId cascade (check_items.ts:10-12).
export const createCheckItemSchema = z.object({
  checklistId: z.number().int().positive(),
  text: textSchema,
  done: z.boolean().default(false),
  position: positionSchema.default(0),
});

// PATCH /check-items/:id
export const updateCheckItemSchema = z
  .object({
    text: textSchema.optional(),
    done: z.boolean().optional(),
    position: positionSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type CreateCheckItemInput = z.infer<typeof createCheckItemSchema>;
export type UpdateCheckItemInput = z.infer<typeof updateCheckItemSchema>;
