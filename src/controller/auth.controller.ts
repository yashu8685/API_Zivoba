import type { Context } from "hono";
import { checkEmailExists } from "../service/auth.service.js";
import {
  loginSchema,
  registerSchema,
} from "../validators/users.validator.js";

import {
  loginUser,
  registerUser,
} from "../service/auth.service.js";
export const checkEmail = async (c: Context) => {
    try {
        const body = await c.req.json();

        const email = body.email?.toString().trim().toLowerCase();

        if (!email) {
            return c.json(
                {
                    success: false,
                    message: "Email is required",
                },
                400
            );
        }

        const exists = await checkEmailExists(email);

        if (exists) {
            return c.json(
                {
                    success: false,
                    message: "Email already registered",
                },
                409
            );
        }

        return c.json({
            success: true,
            message: "Email is available",
        });
    } catch (error) {
        console.error("Check email error:", error);

        return c.json(
            {
                success: false,
                message: "Failed to check email",
            },
            500
        );
    }
};
export const register = async (c: Context) => {
  try {
    // 1. Read request body
    const body = await c.req.json();

    // 2. Validate request
    const input = registerSchema.parse(body);

    // 3. Call service
    const result = await registerUser(input);

    // 4. Handle known business error
    if (!result.success && result.reason === "EMAIL_EXISTS") {
      return c.json(
        {
          success: false,
          message: "Email already registered",
        },
        409,
      );
    }

    // 5. Return response
    return c.json(
      {
        success: true,
        message: "Registration successful",
        user: result.user,
      },
      201,
    );
  } catch (error) {
    console.error("Registration error:", error);

    return c.json(
      {
        success: false,
        message: "Registration failed",
      },
      500,
    );
  }
};

export const login = async (c: Context) => {
  try {
    // 1. Read request body
    const body = await c.req.json();

    // 2. Validate request
    const input = loginSchema.parse(body);

    // 3. Call service
    const result = await loginUser(input);

    // 4. Handle invalid credentials
    if (
      !result.success &&
      result.reason === "INVALID_CREDENTIALS"
    ) {
      return c.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        401,
      );
    }

    // 5. Handle inactive account
    if (
      !result.success &&
      result.reason === "ACCOUNT_INACTIVE"
    ) {
      return c.json(
        {
          success: false,
          message: "Account is inactive",
        },
        403,
      );
    }

    // 6. Return response
    return c.json({
      success: true,
      message: "Login successful",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("Login error:", error);

    return c.json(
      {
        success: false,
        message: "Login failed",
      },
      500,
    );
  }
};