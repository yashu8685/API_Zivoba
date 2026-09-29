import { HttpError } from "./http_error.js";
import { StatusCodes } from "./status_codes.js";

// 500 — obtained from src/services/auth_service.ts / user_service.ts
// (slug generation, insert failures) and handler/index fallbacks.
export class InternalServerError extends HttpError {
  constructor(message = "Internal server error") {
    super(StatusCodes.INTERNAL_SERVER_ERROR, message);
    this.name = "InternalServerError";
  }
}
