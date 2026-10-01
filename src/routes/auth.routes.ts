import { Hono } from "hono";

import {
  register,
  login,
} from "../controller/auth.controller.js";
import { checkEmail } from "../controller/auth.controller.js";
const authRoutes = new Hono();
authRoutes.post("/check-email", checkEmail);
authRoutes.post("/register", register);
authRoutes.post("/login", login);

export default authRoutes;