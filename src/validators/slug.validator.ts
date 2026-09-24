// Shared slug schema factory — single source for the URL-friendly format
// stored in the `slug` columns. Only `max` differs per table (50/100/150/255),
// so each validator file calls createSlug(N).
import { z } from "zod";

export const createSlug = (max: number) =>
  z
    .string()
    .trim()
    .toLowerCase()
    .max(max)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, hyphens");
