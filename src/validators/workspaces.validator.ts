// Validators for workspaces table (src/db/schema/workspaces.ts).
// createdBy / createdAt / updatedAt / deletedAt are server-generated.
import { z } from "zod";
import { createSlug } from "./slug.validator.js";

const nameSchema = z.string().trim().min(1).max(150);
const descriptionSchema = z.string().trim().max(2000).optional();
// Optional slug override; server generates from name if omitted. Globally unique.
const slugSchema = createSlug(150);

// POST /workspaces — name unique (workspaces.ts:9), creator from auth session.
export const createWorkspaceSchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  description: descriptionSchema,
});

// PATCH /workspaces/:id — all optional, at least one required.
export const updateWorkspaceSchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    description: descriptionSchema.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
