import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import type { AppVariables } from "../types/app.js";
import {
  listBoardListsHandler,
  createListHandler,
  getListHandler,
  updateListHandler,
  deleteListHandler,
  restoreListHandler,
} from "../handlers/list_handler.js";

// Endpoints only — validation happens inside handlers via validateReqPayload,
// request/response in handlers, DB in services.
const lists = new Hono<{ Variables: AppVariables }>();

lists.use("*", authMiddleware);

lists.get("/", listBoardListsHandler);
lists.post("/", createListHandler);

lists.get("/:id", getListHandler);
lists.patch("/:id", updateListHandler);
lists.delete("/:id", deleteListHandler);
lists.post("/:id/restore", restoreListHandler);

export default lists;
