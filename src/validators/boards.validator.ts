// Validators for boards table (src/db/schema/boards.ts).
// createdBy / createdAt / updatedAt / deletedAt are server-generated.
import { z } from "zod";
import { createSlug } from "./slug.validator.js";

const nameSchema = z.string().trim().min(1).max(150);
const descriptionSchema = z.string().trim().max(2000).optional();
// Optional slug override; server generates from name if omitted. Unique per workspace.
const slugSchema = createSlug(150);

// POST /boards — (workspaceId, name) unique.
export const createBoardSchema = z.object({
  workspaceId: z.number().int().positive(),
  name: nameSchema,
  slug: slugSchema.optional(),
  description: descriptionSchema,
});

// PATCH /boards/:id — all optional, at least one required.
export const updateBoardSchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    description: descriptionSchema.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
