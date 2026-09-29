import type { Context } from "hono";
import { HttpError } from "./http_error.js";
import { StatusCodes } from "./status_codes.js";
import { UnprocessableContentError } from "./unprocessable_content.exception.js";

// Shared error mapper — moved from handlers/auth_handler.ts + handlers/user_handler.ts.
// Converts thrown HttpError subclasses to JSON + status, everything else to 500.
// 422s also carry field-level details (like err_data in the reference project).
export function toErrorResponse(c: Context, err: unknown) {
  if (err instanceof UnprocessableContentError) {
    return c.json({ error: err.message, details: err.details ?? null }, err.status);
  }
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "Internal server error" }, StatusCodes.INTERNAL_SERVER_ERROR);
}
