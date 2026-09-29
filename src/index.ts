import "dotenv/config";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import type { AppVariables } from "./types/app.js";
import { StatusCodes } from "./exceptions/index.js";
import auth from "./routes/auth.js";
import users from "./routes/users.js";
import workspaces from "./routes/workspaces.js";
import boards from "./routes/boards.js";
import invitations from "./routes/invitations.js";
import lists from "./routes/lists.js";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", logger());
app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true }, StatusCodes.OK));

app.route("/auth", auth);
app.route("/users", users);
app.route("/workspaces", workspaces);
app.route("/boards", boards);
app.route("/invitations", invitations);
app.route("/lists", lists);

app.notFound((c) => c.json({ error: "Not found" }, StatusCodes.NOT_FOUND));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, StatusCodes.INTERNAL_SERVER_ERROR);
});

const port = Number(process.env.PORT ?? 3000);

console.log(`Listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

export default app;
