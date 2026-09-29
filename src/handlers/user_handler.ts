import type { Context } from "hono";
import { BadRequestError, ForbiddenError, StatusCodes, toErrorResponse } from "../exceptions/index.js";
import { validateReqPayload } from "../validations/validate-req.js";
import type {
  AdminResetPasswordInput,
  ChangePasswordInput,
  CreateUserInput,
  UpdateUserInput,
} from "../validators/users.validator.js";
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  changePassword,
  softDeleteUser,
  restoreUser,
} from "../services/user_service.js";
import type { AuthedContext } from "../types/app.js";

async function readJsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }
}

function parseId(param: string | undefined): number | null {
  if (!param) return null;
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /users?q=&limit=&offset= — superadmin only (route enforces).
export async function listUsersHandler(c: AuthedContext) {
  try {
    const q = c.req.query("q");
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
    const offset = c.req.query("offset") ? Number(c.req.query("offset")) : undefined;
    const result = await listUsers({ q, limit, offset });
    return c.json({ data: result.data, total: result.total }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// POST /users — superadmin only (route enforces). Validates via validateReqPayload.
export async function createUserHandler(c: AuthedContext) {
  try {
    const body = await validateReqPayload<CreateUserInput>(
      "user:create",
      await readJsonBody(c),
      "Invalid user data"
    );
    const user = await createUser(body);
    return c.json({ data: user }, StatusCodes.CREATED);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// GET /users/me
export async function getMeHandler(c: AuthedContext) {
  try {
    const user = await getUserById(c.get("user").id);
    return c.json({ data: user }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// PATCH /users/me — self update; isActive change forbidden for non-superadmin.
export async function updateMeHandler(c: AuthedContext) {
  try {
    const me = c.get("user");
    const body = await validateReqPayload<UpdateUserInput>(
      "user:update",
      await readJsonBody(c),
      "Invalid user data"
    );
    if (body.isActive !== undefined && me.role !== "superadmin") {
      throw new ForbiddenError("Cannot change isActive");
    }
    const user = await updateUser(me.id, body);
    return c.json({ data: user }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// PATCH /users/me/password — self change, needs currentPassword.
export async function changeMyPasswordHandler(c: AuthedContext) {
  try {
    const me = c.get("user");
    const body = await validateReqPayload<ChangePasswordInput>(
      "user:change-password",
      await readJsonBody(c),
      "Invalid password data"
    );
    await changePassword(me.id, body);
    return c.json({ message: "Password updated" }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// GET /users/:id — self or superadmin.
export async function getUserHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const me = c.get("user");
    if (me.role !== "superadmin" && me.id !== id) {
      throw new ForbiddenError();
    }
    const user = await getUserById(id);
    return c.json({ data: user }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// PATCH /users/:id — self or superadmin; only superadmin may touch isActive.
export async function updateUserHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const me = c.get("user");
    if (me.role !== "superadmin" && me.id !== id) {
      throw new ForbiddenError();
    }
    const body = await validateReqPayload<UpdateUserInput>(
      "user:update",
      await readJsonBody(c),
      "Invalid user data"
    );
    if (body.isActive !== undefined && me.role !== "superadmin") {
      throw new ForbiddenError("Cannot change isActive");
    }
    const user = await updateUser(id, body);
    return c.json({ data: user }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// PATCH /users/:id/password — superadmin reset, body { newPassword }.
export async function resetPasswordHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const body = await validateReqPayload<AdminResetPasswordInput>(
      "user:reset-password",
      await readJsonBody(c),
      "Invalid password data"
    );
    await changePassword(id, { currentPassword: "", newPassword: body.newPassword }, { skipCurrentCheck: true });
    return c.json({ message: "Password reset" }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// DELETE /users/:id — superadmin soft delete.
export async function deleteUserHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    await softDeleteUser(id);
    return c.json({ message: "User deleted" }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}

// POST /users/:id/restore — superadmin restore.
export async function restoreUserHandler(c: AuthedContext) {
  try {
    const id = parseId(c.req.param("id"));
    if (!id) throw new BadRequestError("Invalid id");
    const user = await restoreUser(id);
    return c.json({ data: user }, StatusCodes.OK);
  } catch (err) {
    return toErrorResponse(c, err);
  }
}
