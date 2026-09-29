// Validators for users table (src/db/schema/users.ts).
// passwordHash is never accepted from clients — accept plain `password` instead.
// role defaults to "user"; register never sends it, only superadmin creates set it.
import { z } from "zod";
import { systemRoleSchema } from "./enums.validator.js";
import { createSlug } from "./slug.validator.js";

const nameSchema = z.string().trim().min(1).max(100);
const emailSchema = z.string().trim().toLowerCase().email().max(255);
const passwordSchema = z.string().min(8).max(128);
const avatarUrlSchema = z.string().trim().url().max(2048).optional();
// Optional slug override; server generates from name if omitted. Unique.
const slugSchema = createSlug(100);

// POST /auth/register — no role sent, server defaults to "user".
export const registerSchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  email: emailSchema,
  password: passwordSchema,
  avatarUrl: avatarUrlSchema,
});

// POST /auth/login
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

// POST /users (superadmin creates with explicit role)
export const createUserSchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  email: emailSchema,
  password: passwordSchema,
  role: systemRoleSchema.default("user"),
  avatarUrl: avatarUrlSchema,
  isActive: z.boolean().default(true),
});

// PATCH /users/:id — all fields optional, at least one required.
export const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    email: emailSchema.optional(),
    avatarUrl: avatarUrlSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

// PATCH /users/:id/password
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

// PATCH /users/:id/password (superadmin reset) — no currentPassword needed.
export const adminResetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
