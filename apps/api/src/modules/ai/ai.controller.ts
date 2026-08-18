import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { roleGuard } from "../../common/guards/roles.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { validateBody } from "../../common/pipes/validation.pipe";
import { z } from "zod";
import { generatePollContent } from "./ai.service";

const ImproveQuestionSchema = z.object({
  question: z.string().trim().min(1),
  category: z.string().trim().min(1),
});

const router = Router();

router.post("/improve-question", authGuard, roleGuard("MODERATOR"), rateLimiter.api, validateBody(ImproveQuestionSchema), async (req, res, next) => {
  try {
    const result = await generatePollContent(req.body.question, req.body.category);
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
});

export { router as aiRouter };
