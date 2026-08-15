import { createServer } from "http";
import { initAutoModeratorCron } from "./modules/moderation/auto-moderation.cron";
import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./common/interceptors/logger";
import { prisma } from "./config/database";
import { redis } from "./config/redis";
import { startWorkers } from "./jobs";
import { initErrorTracking } from "./common/instrumentation/error-tracking";
import { startJournalistCron } from "./modules/ai/journalist.service";
import { initializeFirebase } from "./config/firebase";
import { initWebSocket } from "./gateway/socket";

const PORT = config.port;

async function bootstrap() {
  initErrorTracking();

  // Initialize Firebase Admin SDK for push notifications
  initializeFirebase();

  const app = createApp();

  // Health check
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Create the explicit HTTP server
  const server = createServer(app);

  // Initialize WebSocket Gateway *before* listening
  initWebSocket(server);

  server.listen(PORT, () => {
    initAutoModeratorCron();
    logger.info(`Pulse API running on port ${PORT} in ${config.nodeEnv} mode`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      await prisma.$disconnect();
      await redis.quit();
      logger.info("Server closed. Exiting.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Start background workers
  await startWorkers();

  // Start the daily AI Data Journalism cron job
  startJournalistCron();
}

bootstrap().catch((err) => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});
