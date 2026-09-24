// Validators for labels table (src/db/schema/labels.ts).
// Workspace-scoped; (workspaceId, name) unique; soft delete.
import { z } from "zod";
import { createSlug } from "./slug.validator.js";

const nameSchema = z.string().trim().min(1).max(50);
const colorSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^[a-zA-Z]+$/, {
    message: "Color must be a hex code or named color",
  });
// Optional slug override; server generates from name if omitted. Unique per workspace.
const slugSchema = createSlug(50);

// POST /labels — workspaceId + name unique (labels.ts:24).
export const createLabelSchema = z.object({
  workspaceId: z.number().int().positive(),
  name: nameSchema,
  slug: slugSchema.optional(),
  color: colorSchema,
});

// PATCH /labels/:id
export const updateLabelSchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    color: colorSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
