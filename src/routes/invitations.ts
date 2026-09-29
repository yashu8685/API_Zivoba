import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import type { AppVariables } from "../types/app.js";
import { acceptInvitationHandler } from "../handlers/invitation_handler.js";

// Token-based invite acceptance — any logged-in user whose email matches.
const invitations = new Hono<{ Variables: AppVariables }>();

invitations.use("*", authMiddleware);
invitations.post("/accept", acceptInvitationHandler);

export default invitations;
