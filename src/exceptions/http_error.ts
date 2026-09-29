import type { StatusCode } from "./status_codes.js";

// Base HTTP error — all exceptions below extend this.
export class HttpError extends Error {
  status: StatusCode;
  constructor(status: StatusCode, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
