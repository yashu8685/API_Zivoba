// Central status codes — single source, no magic numbers in routes/handlers.
export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_CONTENT: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type StatusCode = (typeof StatusCodes)[keyof typeof StatusCodes];
