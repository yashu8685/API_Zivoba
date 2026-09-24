import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env");
}

const queryClient = postgres(connectionString, { max: 1 });

export const db = drizzle(queryClient, { schema });

export { queryClient };
export * from "./schema/index.js";
