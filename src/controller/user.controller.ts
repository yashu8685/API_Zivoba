import type { Context } from "hono";

import {
    getCurrentUser,
    getUserBoards,
    updateCurrentUser,
    changeUserPassword,
} from "../service/user.service.js";

export const getMe = async (c: Context) => {
    try {
        const authUser = c.get("user");

        const user = await getCurrentUser(authUser.userId);

        if (!user) {
            return c.json(
                {
                    success: false,
                    message: "User not found",
                },
                404
            );
        }

        return c.json({
            success: true,
            user,
        });
    } catch (error) {
        console.error("Get current user error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to get user",
            },
            500
        );
    }
};

export const getBoards = async (c: Context) => {
    try {
        const authUser = c.get("user");

        const userBoards = await getUserBoards(authUser.userId);

        return c.json({
            success: true,
            boards: userBoards,
        });
    } catch (error) {
        console.error("Get user boards error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to get user boards",
            },
            500
        );
    }
};

export const updateMe = async (c: Context) => {
    try {
        const authUser = c.get("user");

        const body = await c.req.json();

        const name =
            typeof body.name === "string"
                ? body.name.trim()
                : undefined;

        const email =
            typeof body.email === "string"
                ? body.email.trim().toLowerCase()
                : undefined;

        if (name === undefined && email === undefined) {
            return c.json(
                {
                    success: false,
                    message: "Nothing to update",
                },
                400
            );
        }

        if (name !== undefined && name.length === 0) {
            return c.json(
                {
                    success: false,
                    message: "Name cannot be empty",
                },
                400
            );
        }

        if (email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                return c.json(
                    {
                        success: false,
                        message: "Invalid email address",
                    },
                    400
                );
            }
        }

        const result = await updateCurrentUser(
            authUser.userId,
            {
                name,
                email,
            }
        );

        if (result.reason === "USER_NOT_FOUND") {
            return c.json(
                {
                    success: false,
                    message: "User not found",
                },
                404
            );
        }

        if (result.reason === "EMAIL_ALREADY_EXISTS") {
            return c.json(
                {
                    success: false,
                    message: "Email already exists",
                },
                409
            );
        }

        return c.json({
            success: true,
            message: "Profile updated successfully",
            user: result.user,
        });
    } catch (error) {
        console.error("Update current user error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to update profile",
            },
            500
        );
    }
};
export const changePassword = async (c: Context) => {
    try {
        const authUser = c.get("user");

        const body = await c.req.json();

        const currentPassword =
            typeof body.currentPassword === "string"
                ? body.currentPassword
                : undefined;

        const newPassword =
            typeof body.newPassword === "string"
                ? body.newPassword
                : undefined;

        if (!currentPassword || !newPassword) {
            return c.json(
                {
                    success: false,
                    message: "Current password and new password are required",
                },
                400
            );
        }

        if (newPassword.length < 6) {
            return c.json(
                {
                    success: false,
                    message: "New password must be at least 6 characters",
                },
                400
            );
        }

        const result = await changeUserPassword(
            authUser.userId,
            currentPassword,
            newPassword
        );

        if (result.reason === "USER_NOT_FOUND") {
            return c.json(
                {
                    success: false,
                    message: "User not found",
                },
                404
            );
        }

        if (result.reason === "INVALID_CURRENT_PASSWORD") {
            return c.json(
                {
                    success: false,
                    message: "Current password is incorrect",
                },
                401
            );
        }

        return c.json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error) {
        console.error("Change password error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to change password",
            },
            500
        );
    }
};