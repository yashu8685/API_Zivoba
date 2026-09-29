import { BadRequestError } from "../exceptions/bad_request.exception.js";
import { UnprocessableContentError } from "../exceptions/unprocessable_content.exception.js";
import {
  adminResetPasswordSchema,
  changePasswordSchema,
  createUserSchema,
  loginSchema,
  registerSchema,
  updateUserSchema,
} from "../validators/users.validator.js";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "../validators/workspaces.validator.js";
import {
  createBoardSchema,
  updateBoardSchema,
} from "../validators/boards.validator.js";
import {
  addBoardMemberSchema,
  updateBoardMemberRoleSchema,
} from "../validators/board_members.validator.js";
import {
  acceptInvitationSchema,
  sendInvitationSchema,
} from "../validators/invitations.validator.js";
import {
  createListSchema,
  reorderListsSchema,
  updateListSchema,
} from "../validators/lists.validator.js";

// Actions map 1:1 to a Zod schema — extend the union + switch as new
// resources (cards, …) get their validators.
export type ValidationAction =
  | "auth:register"
  | "auth:login"
  | "user:create"
  | "user:update"
  | "user:change-password"
  | "user:reset-password"
  | "workspace:create"
  | "workspace:update"
  | "board:create"
  | "board:update"
  | "board:add-member"
  | "board:update-member-role"
  | "invitation:send"
  | "invitation:accept"
  | "list:create"
  | "list:update"
  | "list:reorder";

// Central dispatcher (called from handlers, never routes): picks the schema
// for the action, parses reqData, throws 422 with field details on mismatch.
export async function validateReqPayload<T>(
  action: ValidationAction,
  reqData: unknown,
  errMsg: string
): Promise<T> {
  let schema;
  switch (action) {
    case "auth:register":
      schema = registerSchema;
      break;
    case "auth:login":
      schema = loginSchema;
      break;
    case "user:create":
      schema = createUserSchema;
      break;
    case "user:update":
      schema = updateUserSchema;
      break;
    case "user:change-password":
      schema = changePasswordSchema;
      break;
    case "user:reset-password":
      schema = adminResetPasswordSchema;
      break;
    case "workspace:create":
      schema = createWorkspaceSchema;
      break;
    case "workspace:update":
      schema = updateWorkspaceSchema;
      break;
    case "board:create":
      schema = createBoardSchema;
      break;
    case "board:update":
      schema = updateBoardSchema;
      break;
    case "board:add-member":
      schema = addBoardMemberSchema;
      break;
    case "board:update-member-role":
      schema = updateBoardMemberRoleSchema;
      break;
    case "invitation:send":
      schema = sendInvitationSchema;
      break;
    case "invitation:accept":
      schema = acceptInvitationSchema;
      break;
    case "list:create":
      schema = createListSchema;
      break;
    case "list:update":
      schema = updateListSchema;
      break;
    case "list:reorder":
      schema = reorderListsSchema;
      break;
    default:
      throw new BadRequestError("Invalid validation type");
  }

  const parsed = schema.safeParse(reqData);
  if (!parsed.success) {
    throw new UnprocessableContentError(errMsg, parsed.error.flatten());
  }
  return parsed.data as T;
}
