// Validators for password_reset_tokens table (src/db/schema/password_reset_tokens.ts).
// userId / expiresAt / usedAt / createdAt are server-generated — never from client.
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const tokenSchema = z.string().trim().min(1).max(512);
const newPasswordSchema = z.string().min(8).max(128);

// POST /auth/forgot-password — client sends email only.
export const requestResetSchema = z.object({
  email: emailSchema,
});

// GET /auth/reset-password/:token — token lookup (token unique covers index).
export const verifyTokenSchema = z.object({
  token: tokenSchema,
});

// POST /auth/reset-password — token + new plain password.
export const resetPasswordSchema = z.object({
  token: tokenSchema,
  newPassword: newPasswordSchema,
});

export type RequestResetInput = z.infer<typeof requestResetSchema>;
export type VerifyTokenInput = z.infer<typeof verifyTokenSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
