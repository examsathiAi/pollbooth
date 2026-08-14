import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { badgesService } from "./badges.service";

const router = Router();

router.get("/", authGuard, async (req, res, next) => {
  try {
    const result = await badgesService.getUserBadges(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/me", authGuard, async (req, res, next) => {
  try {
    const result = await badgesService.getMeBadges(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/all", async (req, res, next) => {
  try {
    const result = await badgesService.getAllBadges();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/leaderboard/:badgeCode", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await badgesService.getBadgeLeaderboard(req.params.badgeCode, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/top", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await badgesService.getTopBadges(limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as badgeRouter };
