import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { registerSchema, loginSchema } from "../validation/authValidation.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../utils/token.js";

/**
 * Handle new user registration
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    // 1. Validate payload with Zod schema
    const validatedData = registerSchema.parse(req.body);
    const normalizedEmail = validatedData.email.trim().toLowerCase();

    // 2. Check for duplicate account
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email address already exists."
        }
      });
    }

    // 3. Hash password with bcrypt cost factor 12
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // 4. Create and persist user
    const newUser = await User.create({
      name: validatedData.name.trim(),
      email: normalizedEmail,
      passwordHash
    });

    // 5. Issue session JWT and set HttpOnly cookie
    const token = signToken({
      id: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name
    });

    setAuthCookie(res, token);

    // 6. Return sanitized user object
    res.status(201).json({
      message: "Account registered successfully.",
      user: newUser.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user login
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    // 1. Validate login payload
    const validatedData = loginSchema.parse(req.body);
    const normalizedEmail = validatedData.email.trim().toLowerCase();

    // 2. Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    // 3. Check user existence and verify password
    const isPasswordValid = user ? await user.comparePassword(validatedData.password) : false;

    if (!user || !isPasswordValid) {
      // Security requirement: Generic message to prevent email enumeration
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password."
        }
      });
    }

    // 4. Issue session token and set cookie
    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name
    });

    setAuthCookie(res, token);

    res.status(200).json({
      message: "Signed in successfully.",
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  // req.user is guaranteed by requireAuth middleware
  res.status(200).json({
    user: req.user.toSafeObject()
  });
};

/**
 * Log out user and clear auth cookie
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({
    message: "Signed out successfully."
  });
};
