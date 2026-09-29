import { HttpError } from "./http_error.js";
import { StatusCodes } from "./status_codes.js";

// 409 — obtained from src/services/auth_service.ts and
// src/services/user_service.ts ("Email already in use").
export class ConflictError extends HttpError {
  constructor(message = "Conflict") {
    super(StatusCodes.CONFLICT, message);
    this.name = "ConflictError";
  }
}
