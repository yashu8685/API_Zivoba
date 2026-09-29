import { HttpError } from "./http_error.js";
import { StatusCodes } from "./status_codes.js";

// 400 — obtained from src/handlers/user_handler.ts ("Invalid id").
export class BadRequestError extends HttpError {
  constructor(message = "Bad request") {
    super(StatusCodes.BAD_REQUEST, message);
    this.name = "BadRequestError";
  }
}
