import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "../config/redis";
import { logger } from "../common/interceptors/logger";

export let io: Server;

export const initWebSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Allows your Next.js frontend to connect
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  try {
    // IORedis easily duplicates the existing connection for pub/sub scaling
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();

    io.adapter(createAdapter(pubClient, subClient));
    logger.info("WebSocket: Redis adapter initialized successfully");
  } catch (error) {
    logger.error("WebSocket: Failed to initialize Redis adapter", error);
  }

  io.on("connection", (socket) => {
    logger.info(`WebSocket: Client connected [${socket.id}]`);

    // Clients will emit this when viewing a specific poll page
    socket.on("join_poll", (pollId: string) => {
      socket.join(`poll_${pollId}`);
      logger.info(`WebSocket: Client ${socket.id} joined poll_${pollId}`);
    });

    socket.on("leave_poll", (pollId: string) => {
      socket.leave(`poll_${pollId}`);
      logger.info(`WebSocket: Client ${socket.id} left poll_${pollId}`);
    });

    socket.on("disconnect", () => {
      logger.info(`WebSocket: Client disconnected [${socket.id}]`);
    });
  });

  return io;
};
