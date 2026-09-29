import { HttpError } from "./http_error.js";
import { StatusCodes } from "./status_codes.js";

// 422 — thrown by validateReqPayload (src/validations/validate-req.ts) when
// the body fails schema validation. Carries field-level details (errData).
export class UnprocessableContentError extends HttpError {
  details?: unknown;
  constructor(message = "Unprocessable content", details?: unknown) {
    super(StatusCodes.UNPROCESSABLE_CONTENT, message);
    this.name = "UnprocessableContentError";
    this.details = details;
  }
}
