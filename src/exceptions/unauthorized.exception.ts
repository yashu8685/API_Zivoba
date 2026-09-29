import { HttpError } from "./http_error.js";
import { StatusCodes } from "./status_codes.js";

// 401 — obtained from src/services/auth_service.ts (login),
// src/services/user_service.ts (wrong current password),
// src/middleware/auth.ts (missing/invalid/expired token, inactive account).
export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized") {
    super(StatusCodes.UNAUTHORIZED, message);
    this.name = "UnauthorizedError";
  }
}
