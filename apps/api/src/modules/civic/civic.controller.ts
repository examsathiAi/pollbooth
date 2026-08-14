import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { roleGuard } from "../../common/guards/roles.guard";
import { validateBody } from "../../common/pipes/validation.pipe";
import { civicService } from "./civic.service";
import { CreateCivicIssueSchema } from "./civic.types";

const router = Router();

router.post("/issues", authGuard, rateLimiter.civicIssue, validateBody(CreateCivicIssueSchema), async (req, res, next) => {
  try {
    const result = await civicService.createIssue(req.user!.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/issues", authGuard, roleGuard("MODERATOR"), async (req, res, next) => {
  try {
    const result = await civicService.getIssues(
      req.query.city as string,
      req.query.state as string,
      req.query.status as string,
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/issues/:id", authGuard, async (req, res, next) => {
  try {
    const result = await civicService.getIssueById(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch("/issues/:id/approve", authGuard, roleGuard("MODERATOR"), async (req, res, next) => {
  try {
    const result = await civicService.approveIssue(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch("/issues/:id/reject", authGuard, roleGuard("MODERATOR"), async (req, res, next) => {
  try {
    const result = await civicService.rejectIssue(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/issues/:id/convert", authGuard, roleGuard("ADMIN", "MODERATOR"), rateLimiter.civicIssue, async (req, res, next) => {
  try {
    const { question, options } = req.body as { question?: string; options?: string[] };

    if (!options || options.length < 2) {
      return res.status(400).json({ error: "Validation Error", message: "At least 2 options are required" });
    }

    const result = await civicService.convertToPoll(req.user!.id, req.params.id, {
      question: question,
      options,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export { router as civicRouter };
