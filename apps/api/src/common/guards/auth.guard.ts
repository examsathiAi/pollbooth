import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config";
import { prisma } from "../../config/database";

export interface AuthenticatedRequest extends Request {}

function touchLastActive(user: { id: string; last_active_at?: Date | null }) {
  const last = user.last_active_at ? new Date(user.last_active_at).getTime() : 0;
  if (Date.now() - last < 60 * 60 * 1000) return;
  prisma.user.update({ where: { id: user.id }, data: { last_active_at: new Date() } }).catch(() => {});
}

export async function authGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Mobile App Strategy: Check Authorization Header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } 
    // 2. Web Strategy: Fallback to Cookies
    else if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(";").map(c => c.trim());
      const accessCookie = cookies.find(c => c.startsWith("accessToken="));
      if (accessCookie) token = accessCookie.split("=")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Unauthorized", message: "Missing or invalid token" });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; type: string };

    if (decoded.type !== "access") {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid token type" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, phone_hash: true, username: true, role: true, is_banned: true, is_active: true, last_active_at: true },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Unauthorized", message: "User not found or inactive" });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: "Forbidden", message: "Account banned" });
    }

    touchLastActive(user);
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Unauthorized", message: "Token expired" });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid token" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function optionalAuthGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(";").map(c => c.trim());
      const accessCookie = cookies.find(c => c.startsWith("accessToken="));
      if (accessCookie) token = accessCookie.split("=")[1];
    }

    if (!token) {
      return next(); // no token = guest, proceed
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; type: string };
    if (decoded.type !== "access") {
      return next(); // bad token type = treat as guest
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, phone_hash: true, username: true, role: true, is_banned: true, is_active: true, last_active_at: true },
    });

    if (user && user.is_active && !user.is_banned) {
      touchLastActive(user);
      req.user = user; // valid user, attach it
    }
    // whether or not user was found, always proceed
    next();
  } catch (err) {
    // any error (expired token, invalid token, etc) = just treat as guest
    next();
  }
}
