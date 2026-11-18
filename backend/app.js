import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";
import dictionaryRoutes from "./routes/dictionaryRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { csrfProtection } from "./middleware/csrfProtection.js";

const app = express();

// Trust first proxy hop (Render, Cloudflare, AWS ELB)
// Ensures express-rate-limit resolves correct client IP and secure cookies function behind reverse proxies
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"]
  })
);

// Body and cookie parsing
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// General API rate limiting
app.use("/api", apiRateLimiter);

// CSRF protection for mutation endpoints
app.use(csrfProtection);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api", dictionaryRoutes);
app.use("/api", systemRoutes);

// 404 Fallback for unknown API routes
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested API endpoint does not exist."
    }
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
