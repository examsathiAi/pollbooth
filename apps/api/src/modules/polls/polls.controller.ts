import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { adminGuard } from "../../common/guards/roles.guard";
import { validateBody, validateParams, validateQuery } from "../../common/pipes/validation.pipe";
import { pollsService } from "./polls.service";
import { CreatePollSchema, PollIdSchema, PollQuerySchema } from "./polls.types";

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

router.get("/:id", validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    const result = await pollsService.getPollById(req.params.id, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Admin routes
router.post("/", authGuard, adminGuard, validateBody(CreatePollSchema), async (req, res, next) => {
  try {
    const result = await pollsService.createPoll(req.user!.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/publish", authGuard, adminGuard, validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const result = await pollsService.publishPoll(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/archive", authGuard, adminGuard, validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const result = await pollsService.archivePoll(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as pollRouter };
