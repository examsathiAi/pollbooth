import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { consentService } from "./consent.service";

const router = Router();

router.get("/", authGuard, async (req, res, next) => {
  try {
    const result = await consentService.getUserConsents(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/revoke", authGuard, async (req, res, next) => {
  try {
    const result = await consentService.revokeConsent(req.user!.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as consentRouter };
