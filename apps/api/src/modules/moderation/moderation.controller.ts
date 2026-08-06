import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { roleGuard } from "../../common/guards/roles.guard";
import { validateBody, validateParams } from "../../common/pipes/validation.pipe";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { moderationService } from "./moderation.service";
import { ReportOpinionSchema, ModerateOpinionSchema, BanUserSchema } from "./moderation.types";
import { z } from "zod";

const OpinionIdSchema = z.object({ id: z.string().uuid() });
const UserIdSchema = z.object({ id: z.string().uuid() });

const router = Router();

// Report an opinion
router.post("/:id/report", authGuard, rateLimiter.report, validateParams(OpinionIdSchema), validateBody(ReportOpinionSchema), async (req, res, next) => {
  try {
    const result = await moderationService.reportOpinion(req.user!.id, req.params.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Block a user
router.post("/block/:id", authGuard, validateParams(UserIdSchema), async (req, res, next) => {
  try {
    const result = await moderationService.blockUser(req.user!.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Admin moderation routes
router.get("/queue", authGuard, roleGuard("MODERATOR"), async (req, res, next) => {
  try {
    const status = (req.query.status as string) || "ALL";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await moderationService.getModerationQueue(status, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/moderate", authGuard, roleGuard("MODERATOR"), validateParams(OpinionIdSchema), validateBody(ModerateOpinionSchema), async (req, res, next) => {
  try {
    // In production, check admin role
    const result = await moderationService.moderateOpinion(req.user!.id, req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/users/:id/ban", authGuard, roleGuard("MODERATOR"), validateParams(UserIdSchema), validateBody(BanUserSchema), async (req, res, next) => {
  try {
    const result = await moderationService.banUser(req.user!.id, req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as moderationRouter };
