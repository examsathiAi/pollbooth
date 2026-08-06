import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../interceptors/logger";
import { config } from "../../config";
import { captureException } from "../instrumentation/error-tracking";

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).requestId || "unknown";

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Invalid request data",
      details: err.flatten().fieldErrors,
      requestId,
    });
  }

  if (err.code === "P2002") {
    return res.status(409).json({
      error: "Conflict",
      message: "Resource already exists",
      requestId,
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      error: "Not Found",
      message: "Resource not found",
      requestId,
    });
  }

  logger.error({
    requestId,
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  captureException(err, { requestId, url: req.url, method: req.method });

  const statusCode = err.statusCode || err.status || 500;
  const message = config.isProduction && statusCode === 500
    ? "Internal Server Error"
    : err.message || "Something went wrong";

  res.status(statusCode).json({
    error: err.name || "Error",
    message,
    requestId,
  });
}
