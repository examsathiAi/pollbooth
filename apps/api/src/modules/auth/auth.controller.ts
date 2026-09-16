import { Router } from "express";
import { authService } from "./auth.service";
import { validateBody } from "../../common/pipes/validation.pipe";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { SendOtpSchema, VerifyOtpSchema, RefreshTokenSchema, EmailOtpSendSchema, EmailOtpVerifySchema, GoogleVerifySchema } from "./auth.types";

const router = Router();

const setAuthCookies = (res: any, accessToken: string, refreshToken: string) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("accessToken", accessToken, { httpOnly: true, secure: isProd, sameSite: "lax", maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: isProd, sameSite: "lax", maxAge: 365 * 24 * 60 * 60 * 1000 });
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
    if (result.tokens?.access_token && result.tokens?.refresh_token) {
      setAuthCookies(res, result.tokens.access_token, result.tokens.refresh_token);
    }
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/email-otp/send", rateLimiter.otp, validateBody(EmailOtpSendSchema), async (req, res, next) => {
  try {
    const result = await authService.sendEmailOtp(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/email-otp/verify", rateLimiter.otp, validateBody(EmailOtpVerifySchema), async (req, res, next) => {
  try {
    const result: any = await authService.verifyEmailOtp(req.body, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
    });
    if (result.tokens?.access_token && result.tokens?.refresh_token) {
      setAuthCookies(res, result.tokens.access_token, result.tokens.refresh_token);
    }
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/google/verify", rateLimiter.api, validateBody(GoogleVerifySchema), async (req, res, next) => {
  try {
    const result: any = await authService.verifyGoogle(req.body, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
    });
    if (result.tokens?.access_token && result.tokens?.refresh_token) {
      setAuthCookies(res, result.tokens.access_token, result.tokens.refresh_token);
    }
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", rateLimiter.api, validateBody(RefreshTokenSchema), async (req, res, next) => {
  try {
    let tokenToRefresh = req.body.refresh_token ?? req.body.refreshToken;
    if (!tokenToRefresh && req.headers.cookie) {
      const cookies = req.headers.cookie.split(";").map(c => c.trim());
      const refreshCookie = cookies.find(c => c.startsWith("refreshToken="));
      if (refreshCookie) tokenToRefresh = refreshCookie.split("=")[1];
    }
    if (!tokenToRefresh) {
      return res.status(401).json({ error: "Missing refresh token" });
    }
    const result: any = await authService.refreshToken({ refresh_token: tokenToRefresh });
    if (result.access_token && result.refresh_token) {
      setAuthCookies(res, result.access_token, result.refresh_token);
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
