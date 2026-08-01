import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./common/interceptors/logger";
import { prisma } from "./config/database";
import { redis } from "./config/redis";
import { startWorkers } from "./jobs";

const PORT = config.port;

async function bootstrap() {
  const app = createApp();

  // Health check
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const server = app.listen(PORT, () => {
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
}

bootstrap().catch((err) => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});
