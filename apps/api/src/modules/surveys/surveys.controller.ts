import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { validateBody } from "../../common/pipes/validation.pipe";
import { surveysService } from "./surveys.service";
import { CreateSurveySuggestionSchema } from "./surveys.types";

const router = Router();

router.post("/suggestions", authGuard, rateLimiter.surveySuggestion, validateBody(CreateSurveySuggestionSchema), async (req, res, next) => {
  try {
    const result = await surveysService.createSuggestion(req.user!.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/suggestions", async (req, res, next) => {
  try {
    const result = await surveysService.getSuggestions(
      req.query.status as string,
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});


  // --- B2B PARTNER SURVEYS ---
  router.get("/available", authGuard, async (req, res, next) => {
    try {
      const result = await surveysService.getAvailableSurveys(req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/consent", authGuard, async (req, res, next) => {
    try {
      const result = await surveysService.consentToSurvey(req.user!.id, req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });
export { router as surveyRouter };