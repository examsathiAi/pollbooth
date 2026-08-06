import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config";
import { prisma } from "../../config/database";

export interface AuthenticatedRequest extends Request {}

export async function authGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized", message: "Missing or invalid token" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; type: string };

    if (decoded.type !== "access") {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid token type" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, phone_hash: true, username: true, role: true, is_banned: true, is_active: true },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Unauthorized", message: "User not found or inactive" });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: "Forbidden", message: "Account banned" });
    }

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

export function optionalAuthGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  authGuard(req, res, (err?: any) => {
    if (err) return next();
    next();
  });
}
