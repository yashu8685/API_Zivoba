import { Hono } from "hono";
import { authMiddleware, requireSuperadmin } from "../middleware/auth.js";
import type { AppVariables } from "../types/app.js";
import {
  listWorkspacesHandler,
  createWorkspaceHandler,
  getWorkspaceHandler,
  updateWorkspaceHandler,
  deleteWorkspaceHandler,
  restoreWorkspaceHandler,
  getWorkspaceMembersHandler,
} from "../handlers/workspace_handler.js";

// Endpoints only — validation happens inside handlers via validateReqPayload,
// request/response in handlers, DB in services.
const workspaces = new Hono<{ Variables: AppVariables }>();

workspaces.use("*", authMiddleware);

workspaces.get("/", listWorkspacesHandler);
workspaces.post("/", requireSuperadmin, createWorkspaceHandler);

workspaces.get("/:id/members", getWorkspaceMembersHandler);
workspaces.get("/:id", getWorkspaceHandler);
workspaces.patch("/:id", requireSuperadmin, updateWorkspaceHandler);
workspaces.delete("/:id", requireSuperadmin, deleteWorkspaceHandler);
workspaces.post("/:id/restore", requireSuperadmin, restoreWorkspaceHandler);

export default workspaces;
