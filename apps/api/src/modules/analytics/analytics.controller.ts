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

// Platform-wide analytics endpoints
router.get("/platform/stats", authGuard, async (req, res, next) => {
  try {
    const result = await analyticsService.getPlatformStats();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/platform/top-polls", authGuard, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await analyticsService.getTopPolls(limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/platform/category-trends", authGuard, async (req, res, next) => {
  try {
    const result = await analyticsService.getCategoryTrends();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/platform/regional-breakdown", authGuard, async (req, res, next) => {
  try {
    const result = await analyticsService.getRegionalBreakdown();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/user/:userId", authGuard, async (req, res, next) => {
  try {
    const result = await analyticsService.getUserEngagementStats(req.params.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as analyticsRouter };
