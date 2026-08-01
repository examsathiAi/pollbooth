import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.guard";

export function adminGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // In production, check admin role from user record
  // For now, we check a custom header or env-based token
  const adminToken = req.headers["x-admin-token"];
  if (adminToken !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden", message: "Admin access required" });
  }
  next();
}
