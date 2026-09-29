import { Hono } from "hono";
import { authMiddleware, requireSuperadmin } from "../middleware/auth.js";
import type { AppVariables } from "../types/app.js";
import {
  listBoardsHandler,
  createBoardHandler,
  getBoardHandler,
  updateBoardHandler,
  deleteBoardHandler,
  restoreBoardHandler,
  listBoardMembersHandler,
  addBoardMemberHandler,
  updateBoardMemberRoleHandler,
  removeBoardMemberHandler,
} from "../handlers/board_handler.js";
import {
  listInvitationsHandler,
  sendInvitationHandler,
} from "../handlers/invitation_handler.js";
import { reorderListsHandler } from "../handlers/list_handler.js";

// Endpoints only — validation happens inside handlers via validateReqPayload,
// request/response in handlers, DB in services.
const boards = new Hono<{ Variables: AppVariables }>();

boards.use("*", authMiddleware);

boards.get("/", listBoardsHandler);
boards.post("/", requireSuperadmin, createBoardHandler);

boards.get("/:id/members", listBoardMembersHandler);
boards.post("/:id/members", requireSuperadmin, addBoardMemberHandler);
boards.patch("/:id/members/:userId", requireSuperadmin, updateBoardMemberRoleHandler);
boards.delete("/:id/members/:userId", requireSuperadmin, removeBoardMemberHandler);

boards.get("/:id/invitations", requireSuperadmin, listInvitationsHandler);
boards.post("/:id/invitations", requireSuperadmin, sendInvitationHandler);

boards.patch("/:id/lists/reorder", reorderListsHandler);

boards.get("/:id", getBoardHandler);
boards.patch("/:id", requireSuperadmin, updateBoardHandler);
boards.delete("/:id", requireSuperadmin, deleteBoardHandler);
boards.post("/:id/restore", requireSuperadmin, restoreBoardHandler);

export default boards;
