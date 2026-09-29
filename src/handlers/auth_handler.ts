import type { Context } from "hono";
import { register, login } from "../services/auth_service.js";
import { BadRequestError, StatusCodes, toErrorResponse } from "../exceptions/index.js";
import { validateReqPayload } from "../validations/validate-req.js";
import type { AuthedContext } from "../types/app.js";
import type { RegisterInput, LoginInput } from "../validators/users.validator.js";

async function readJsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }
}

// POST /auth/register — validates via validateReqPayload("auth:register").
export async function registerHandler(c: Context) {
  try {
    const body = await validateReqPayload<RegisterInput>(
      "auth:register",
      await readJsonBody(c),
      "Invalid register data"
    );
    const { user, token } = await register(body);
    return c.json({ data: user, token }, StatusCodes.CREATED);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// POST /auth/login — validates via validateReqPayload("auth:login").
export async function loginHandler(c: Context) {
  try {
    const body = await validateReqPayload<LoginInput>(
      "auth:login",
      await readJsonBody(c),
      "Invalid login data"
    );
    const { user, token } = await login(body);
    return c.json({ data: user, token }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// GET /auth/me — requires authMiddleware, returns current user.
export async function meHandler(c: AuthedContext) {
  const user = c.get("user");
  return c.json({ data: user }, StatusCodes.OK);
}
