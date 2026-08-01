import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { validateBody } from "../../common/pipes/validation.pipe";
import { surveysService } from "./surveys.service";
import { CreateSurveySuggestionSchema } from "./surveys.types";

const router = Router();

router.post("/suggestions", authGuard, validateBody(CreateSurveySuggestionSchema), async (req, res, next) => {
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

export { router as surveyRouter };
