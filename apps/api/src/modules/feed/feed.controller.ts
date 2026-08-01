import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { feedService } from "./feed.service";

const router = Router();

router.get("/", authGuard, async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await feedService.getForYouFeed(req.user!.id, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/trending", async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await feedService.getTrendingFeed(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/local", authGuard, async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await feedService.getLocalFeed(req.user!.id, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/digest", async (req, res, next) => {
  try {
    const date = req.query.date as string | undefined;
    const result = await feedService.getDailyDigest(date);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/related/:pollId", authGuard, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const result = await feedService.getRelatedPolls(req.user!.id, req.params.pollId, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/cohort/:pollId", authGuard, async (req, res, next) => {
  try {
    const result = await feedService.getCohortComparison(req.user!.id, req.params.pollId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as feedRouter };
