import { ZodError } from "zod";
import { env } from "../config/env.js";

/**
 * Centralized application error handling middleware
 */
export const errorHandler = (err, req, res, _next) => {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message
    }));

    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: formattedErrors[0]?.message || "Invalid input data.",
        details: formattedErrors
      }
    });
  }

  // 2. Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({
      error: {
        code: "DUPLICATE_ENTRY",
        message: `An account with this ${field} already exists.`
      }
    });
  }

  // 3. Mongoose Cast Error (Invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      error: {
        code: "INVALID_ID",
        message: "Invalid resource identifier."
      }
    });
  }

  // 4. Custom App Error with explicit status
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || (statusCode === 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED");

  // Log 500 errors server-side
  if (statusCode === 500) {
    console.error("[ServerError]", err);
  }

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: statusCode === 500 && env.IS_PROD ? "An unexpected error occurred." : err.message
    }
  });
};
