// Validators for user_preferences table (src/db/schema/user_preferences.ts).
// 1-to-1 with users (userId unique cascade); updatedAt server-generated.
import { z } from "zod";

// PUT /users/me/preferences — full replace, all default true.
export const upsertPreferencesSchema = z.object({
  mentions: z.boolean().default(true),
  assignments: z.boolean().default(true),
  comments: z.boolean().default(true),
});

// PATCH /users/me/preferences — partial, at least one required.
export const updatePreferencesSchema = z
  .object({
    mentions: z.boolean().optional(),
    assignments: z.boolean().optional(),
    comments: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type UpsertPreferencesInput = z.infer<typeof upsertPreferencesSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
