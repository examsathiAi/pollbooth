import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { validateBody } from "../../common/pipes/validation.pipe";
import { usersService } from "./users.service";
import { UpdateProfileSchema } from "./users.types";

const router = Router();

router.get("/profile", authGuard, async (req, res, next) => {
  try {
    const profile = await usersService.getProfile(req.user!.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.patch("/profile", authGuard, rateLimiter.api, validateBody(UpdateProfileSchema), async (req, res, next) => {
  try {
    const profile = await usersService.updateProfile(req.user!.id, req.body);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.get("/profile/gate/:category", authGuard, async (req, res, next) => {
  try {
    const result = await usersService.getProgressiveProfileGate(req.user!.id, req.params.category);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as userRouter };
