import { db } from "../db/index.js";
import { feedback } from "../db/schema/index.js";

export const createFeedback = async (
    userId: number,
    message: string
) => {
    const result = await db
        .insert(feedback)
        .values({
            userId,
            message,
        })
        .returning();

    return result[0];
};