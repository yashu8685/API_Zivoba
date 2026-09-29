import { HttpError } from "./http_error.js";
import { StatusCodes } from "./status_codes.js";

// 404 — obtained from src/services/user_service.ts ("User not found")
// and src/index.ts (notFound handler).
export class NotFoundError extends HttpError {
  constructor(message = "Not found") {
    super(StatusCodes.NOT_FOUND, message);
    this.name = "NotFoundError";
  }
}
