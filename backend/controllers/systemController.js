import mongoose from "mongoose";
import { env } from "../config/env.js";

const MONGO_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

/**
 * Health check controller
 * GET /api/health
 */
export const getHealth = (_req, res) => {
  const dbState = MONGO_STATES[mongoose.connection.readyState] || "unknown";

  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database: {
      status: dbState
    }
  });
};
