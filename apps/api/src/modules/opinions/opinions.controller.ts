import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { optionalAuthGuard } from "../../common/guards/auth.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { validateBody, validateParams, validateQuery } from "../../common/pipes/validation.pipe";
import { opinionsService } from "./opinions.service";
import { CreateOpinionSchema, ReactOpinionSchema, OpinionQuerySchema } from "./opinions.types";
import { z } from "zod";

const OpinionIdSchema = z.object({ id: z.string().uuid() });
const PollIdSchema = z.object({ id: z.string().uuid() });

const router = Router();

router.post("/:id/opinion", authGuard, rateLimiter.opinion, validateParams(PollIdSchema), validateBody(CreateOpinionSchema), async (req, res, next) => {
  try {
    const result = await opinionsService.createOpinion(req.user!.id, req.params.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/opinions", optionalAuthGuard, validateParams(PollIdSchema), validateQuery(OpinionQuerySchema), async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    const result = await opinionsService.getOpinions(
      req.params.id,
      userId,
      req.query.sort as string,
      Number(req.query.page),
      Number(req.query.limit)
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/react", authGuard, rateLimiter.opinion, validateParams(OpinionIdSchema), validateBody(ReactOpinionSchema), async (req, res, next) => {
  try {
    const result = await opinionsService.reactToOpinion(req.user!.id, req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authGuard, validateParams(OpinionIdSchema), async (req, res, next) => {
  try {
    const result = await opinionsService.deleteOpinion(req.user!.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as opinionRouter };
