import { HttpError } from "./http_error.js";
import { StatusCodes } from "./status_codes.js";

// 403 — obtained from src/handlers/user_handler.ts (cross-user access,
// isActive change) and src/middleware/auth.ts (requireSuperadmin).
export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super(StatusCodes.FORBIDDEN, message);
    this.name = "ForbiddenError";
  }
}
