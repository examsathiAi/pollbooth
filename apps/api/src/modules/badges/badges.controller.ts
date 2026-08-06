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

router.post("/:id/share", authGuard, async (req, res, next) => {
  try {
    const result = await badgesService.shareBadge(req.user!.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as badgeRouter };
