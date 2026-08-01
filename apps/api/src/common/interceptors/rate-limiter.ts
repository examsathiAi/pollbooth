import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redis } from "../../config/redis";
import { config } from "../../config";

const createLimiter = (windowMs: number, max: number, keyPrefix: string, message: string) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const userId = (req as any).user?.id;
      const ip = req.ip || "unknown";
      return `${keyPrefix}:${userId || ip}`;
    },
    handler: (req, res) => {
      res.status(429).json({ error: "Too Many Requests", message });
    },
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as any,
      prefix: `rl:${keyPrefix}:`,
    }),
  });
};

export const rateLimiter = {
  general: createLimiter(60000, 100, "api", "Rate limit exceeded. Please try again later."),
  otp: createLimiter(60 * 60 * 1000, 3, "otp", "Too many OTP requests. Try again in an hour."),
  vote: createLimiter(60000, 10, "vote", "Too many votes. Please slow down."),
  opinion: createLimiter(60000, 5, "opinion", "Too many opinions posted. Please slow down."),
  guestVote: createLimiter(60 * 60 * 1000, 20, "guest", "Too many guest votes from this device."),
};
