import { Router } from "express";
import { authService } from "./auth.service";
import { validateBody } from "../../common/pipes/validation.pipe";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { SendOtpSchema, VerifyOtpSchema, RefreshTokenSchema } from "./auth.types";

const router = Router();

router.post("/otp/send", rateLimiter.otp, validateBody(SendOtpSchema), async (req, res, next) => {
  try {
    const result = await authService.sendOtp(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/otp/verify", validateBody(VerifyOtpSchema), async (req, res, next) => {
  try {
    const result = await authService.verifyOtp(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", validateBody(RefreshTokenSchema), async (req, res, next) => {
  try {
    const result = await authService.refreshToken(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/logout", async (req, res) => {
  // Client should clear tokens; server can blacklist if needed
  res.status(200).json({ message: "Logged out successfully" });
});

export { router as authRouter };
