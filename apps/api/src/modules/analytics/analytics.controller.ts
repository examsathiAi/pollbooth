import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { analyticsService } from "./analytics.service";

const router = Router();

router.get("/polls/:pollId", authGuard, async (req, res, next) => {
  try {
    const result = await analyticsService.getAggregatedResults(req.params.pollId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/b2b/:pollId", authGuard, async (req, res, next) => {
  try {
    const result = await analyticsService.getB2BReport(req.params.pollId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as analyticsRouter };
