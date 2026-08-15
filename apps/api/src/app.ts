import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { config } from "./config";
import { errorHandler } from "./common/filters/error.filter";
import { requestLogger } from "./common/interceptors/logger";
import { rateLimiter } from "./common/interceptors/rate-limiter";
import { authRouter } from "./modules/auth/auth.controller";
import { userRouter } from "./modules/users/users.controller";
import { pollRouter } from "./modules/polls/polls.controller";
import { voteRouter } from "./modules/votes/votes.controller";
import { opinionRouter } from "./modules/opinions/opinions.controller";
import { moderationRouter } from "./modules/moderation/moderation.controller";
import { feedRouter } from "./modules/feed/feed.controller";
import { badgeRouter } from "./modules/badges/badges.controller";
import { civicRouter } from "./modules/civic/civic.controller";
import { surveyRouter } from "./modules/surveys/surveys.controller";
import { consentRouter } from "./modules/consent/consent.controller";
import { adminRouter } from "./modules/admin/admin.controller";
import { notificationRouter } from "./modules/notifications/notifications.controller";
import { paymentRouter } from "./modules/payments/payments.controller";
import { analyticsRouter } from "./modules/analytics/analytics.controller";
import { topicRouter } from "./modules/topics/topics.controller";
import { aiRouter } from "./modules/ai/ai.controller";

export function createApp(): Application {
  const app = express();

  app.set("trust proxy", 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: config.nodeEnv === "production",
    crossOriginEmbedderPolicy: config.nodeEnv === "production",
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));

  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-pulse-guest-session"],
  }));

  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Logging
  if (config.nodeEnv !== "test") {
    app.use(morgan(":method :url :status :res[content-length] - :response-time ms"));
  }
  app.use(requestLogger);

  // Rate limiting
  app.use(rateLimiter.general);

  // API Routes
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", userRouter);
  app.use("/api/v1/polls", pollRouter);
  app.use("/api/v1/votes", voteRouter);
  app.use("/api/v1/opinions", opinionRouter);
  app.use("/api/v1/moderation", moderationRouter);
  app.use("/api/v1/feed", feedRouter);
  app.use("/api/v1/badges", badgeRouter);
  app.use("/api/v1/civic", civicRouter);
  app.use("/api/v1/surveys", surveyRouter);
  app.use("/api/v1/consent", consentRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1/notifications", notificationRouter);
  app.use("/api/v1/payments", paymentRouter);
  app.use("/api/v1/analytics", analyticsRouter);
  app.use("/api/v1/topics", topicRouter);
  app.use("/api/v1/ai", aiRouter);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}
