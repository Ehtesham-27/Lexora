import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

/**
 * Bootstraps the Lexora API server
 */
const startServer = async () => {
  try {
    console.log(`[Server] Initializing Lexora backend in ${env.NODE_ENV} mode...`);

    // Connect to MongoDB
    await connectDatabase(env.MONGODB_URI);

    // Start HTTP listener
    const server = app.listen(env.PORT, () => {
      console.log(`[Server] Lexora API running at http://localhost:${env.PORT}`);
      console.log(`[Server] Allowed CORS origin: ${env.FRONTEND_URL}`);
    });

    // Graceful shutdown handler
    const handleShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log("[Server] HTTP listener closed.");
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown after timeout if pending connections stall
      setTimeout(() => {
        console.error("[Server] Forceful shutdown initiated after timeout.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  } catch (error) {
    console.error("[Server] Startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
