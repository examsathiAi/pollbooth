import { Router } from "express";
import { authService } from "./auth.service";
import { validateBody } from "../../common/pipes/validation.pipe";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { SendOtpSchema, VerifyOtpSchema, RefreshTokenSchema } from "./auth.types";

const router = Router();

// Helper function to set secure cookies
const setAuthCookies = (res: any, accessToken: string, refreshToken: string) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("accessToken", accessToken, { httpOnly: true, secure: isProd, sameSite: "lax", maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: isProd, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
};

router.post("/otp/send", rateLimiter.otp, validateBody(SendOtpSchema), async (req, res, next) => {
  try {
    const result = await authService.sendOtp(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/otp/verify", rateLimiter.otp, validateBody(VerifyOtpSchema), async (req, res, next) => {
  try {
    const result: any = await authService.verifyOtp(req.body, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
    });
    
    // Issue Hybrid Tokens: Set cookies for Web, return JSON for Mobile
    if (result.accessToken && result.refreshToken) {
      setAuthCookies(res, result.accessToken, result.refreshToken);
    }
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", rateLimiter.api, validateBody(RefreshTokenSchema), async (req, res, next) => {
  try {
    // Hybrid token retrieval for refresh
    let tokenToRefresh = req.body.refreshToken;
    if (!tokenToRefresh && req.headers.cookie) {
      const cookies = req.headers.cookie.split(";").map(c => c.trim());
      const refreshCookie = cookies.find(c => c.startsWith("refreshToken="));
      if (refreshCookie) tokenToRefresh = refreshCookie.split("=")[1];
    }

    if (!tokenToRefresh) {
      return res.status(401).json({ error: "Missing refresh token" });
    }

    const result: any = await authService.refreshToken({ refreshToken: tokenToRefresh });
    
    if (result.accessToken && result.refreshToken) {
      setAuthCookies(res, result.accessToken, result.refreshToken);
    }
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/logout", rateLimiter.api, async (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("accessToken", "", { httpOnly: true, secure: isProd, sameSite: "lax", maxAge: 0 });
  res.cookie("refreshToken", "", { httpOnly: true, secure: isProd, sameSite: "lax", maxAge: 0 });
  res.status(200).json({ message: "Logged out successfully" });
});

export { router as authRouter };