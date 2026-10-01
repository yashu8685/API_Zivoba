import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { sql } from "drizzle-orm";

import { db } from "./db/index.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.route.js";
import boardRoutes from "./routes/board.route.js";
import listRoutes from "./routes/list.route.js";
import cardRoutes from "./routes/card.route.js";
import feedbackRoutes from "./routes/feedback.route.js";
import checklistRoutes from "./routes/checklist.route.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
  })
);

app.route("/auth", authRoutes);
app.route("/user", userRoutes);
app.route("/boards", boardRoutes);
app.route("/lists", listRoutes);
app.route("/cards",cardRoutes);
app.route("/cards", checklistRoutes);
app.route("/feedback", feedbackRoutes);

app.get("/health", (c) => {
  return c.json({
    success: true,
    message: "Zivoba API is running",
  });
});

app.get("/db-test", async (c) => {
  try {
    const result = await db.execute(sql`SELECT 1`);

    return c.json({
      success: true,
      message: "Database connection successful",
      result,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return c.json(
      {
        success: false,
        message: "Database connection failed",
      },
      500
    );
  }
});

export default app;