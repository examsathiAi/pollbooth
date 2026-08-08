import { Router } from "express";
import { authGuard, optionalAuthGuard } from "../../common/guards/auth.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { roleGuard } from "../../common/guards/roles.guard";
import { logger } from "../../common/interceptors/logger";
import { validateBody, validateParams, validateQuery } from "../../common/pipes/validation.pipe";
import { pollsService } from "./polls.service";
import { CreatePollSchema, PollIdSchema, PollQuerySchema, PredictPollSchema } from "./polls.types";

const router = Router();

// Public routes
router.get("/", validateQuery(PollQuerySchema), async (req, res, next) => {
  try {
    const result = await pollsService.getPolls(req.query as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/review", authGuard, roleGuard("ADMIN"), validateQuery(PollQuerySchema), async (req, res, next) => {
  try {
    const result = await pollsService.getPendingPolls(req.query as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/feed", optionalAuthGuard, validateQuery(PollQuerySchema), async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    const guestSessionId = typeof req.headers["x-pulse-guest-session"] === "string" ? req.headers["x-pulse-guest-session"] as string : undefined;
    const result = await pollsService.getPolls(req.query as any, userId, guestSessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/estimated-reach", async (req, res, next) => {
  try {
    const result = await pollsService.getEstimatedReach(req.query as any);
    res.json({ estimated_reach: result });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", optionalAuthGuard, validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    const result = await pollsService.getPollById(req.params.id, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/predict", authGuard, validateParams(PollIdSchema), validateBody(PredictPollSchema), async (req, res, next) => {
  try {
    const result = await pollsService.savePrediction(req.user!.id, req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Admin routes
router.post("/", authGuard, roleGuard("ADMIN"), validateBody(CreatePollSchema), async (req, res, next) => {
  try {
    const result = await pollsService.createPoll(req.user!.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown poll creation error";
    const errorDetails = err instanceof Error ? err.stack : undefined;
    logger.error("Poll creation failed", {
      error: errorMessage,
      details: errorDetails,
      requestId: (req as any).requestId,
    });
    next(err);
  }
});

router.post("/:id/approve", authGuard, roleGuard("ADMIN"), rateLimiter.adminAction, validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const result = await pollsService.approvePoll(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/reject", authGuard, roleGuard("ADMIN"), rateLimiter.adminAction, validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const result = await pollsService.rejectPoll(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/publish", authGuard, roleGuard("ADMIN"), rateLimiter.adminAction, validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const result = await pollsService.publishPoll(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/archive", authGuard, roleGuard("ADMIN"), validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const result = await pollsService.archivePoll(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as pollRouter };
