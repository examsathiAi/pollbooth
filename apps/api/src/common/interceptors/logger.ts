import winston from "winston";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "../../config";

export const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "pollbooth-api", environment: config.nodeEnv },
  transports: [
    new winston.transports.Console({
      format: config.isDevelopment
        ? winston.format.combine(winston.format.colorize(), winston.format.simple())
        : undefined,
    }),
  ],
});

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4();
  (req as any).requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration_ms: Date.now() - start,
      ip_hash: req.ip ? require("crypto").createHash("sha256").update(req.ip).digest("hex").substring(0, 16) : null,
      userAgent: req.headers["user-agent"],
    });
  });
  next();
}
