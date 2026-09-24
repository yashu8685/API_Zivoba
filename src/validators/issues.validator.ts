// Validators for issues table (src/db/schema/issues.ts).
// createdBy from auth (restrict); assignedTo nullable (set null).
import { z } from "zod";
import { issueStatusSchema, cardPrioritySchema } from "./enums.validator.js";
import { createSlug } from "./slug.validator.js";

const titleSchema = z.string().trim().min(1).max(255);
const descriptionSchema = z.string().trim().max(10000).optional();
// Optional slug override; server generates from title if omitted.
const slugSchema = createSlug(255);

// POST /cards/:id/issues
export const createIssueSchema = z.object({
  cardId: z.number().int().positive(),
  title: titleSchema,
  slug: slugSchema.optional(),
  description: descriptionSchema,
  status: issueStatusSchema.default("open"),
  priority: cardPrioritySchema.default("medium"),
  assignedTo: z.number().int().positive().optional(),
});

// PATCH /issues/:id
export const updateIssueSchema = z
  .object({
    title: titleSchema.optional(),
    slug: slugSchema.optional(),
    description: descriptionSchema.nullable().optional(),
    status: issueStatusSchema.optional(),
    priority: cardPrioritySchema.optional(),
    assignedTo: z.number().int().positive().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
