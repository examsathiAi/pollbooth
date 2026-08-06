import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.guard";

type RoleLevel = "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";

const ROLE_LEVELS: Record<RoleLevel, number> = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

function hasMinimumRole(userRole: string | undefined, minimumRole: RoleLevel): boolean {
  const currentLevel = ROLE_LEVELS[(userRole as RoleLevel) ?? "USER"] ?? 0;
  const requiredLevel = ROLE_LEVELS[minimumRole];
  return currentLevel >= requiredLevel;
}

export function roleGuard(minimumRole: RoleLevel = "ADMIN") {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!hasMinimumRole(req.user?.role, minimumRole)) {
      return res.status(403).json({ error: "Forbidden", message: `This action requires ${minimumRole} access` });
    }
    next();
  };
}

export const adminGuard = roleGuard("ADMIN");
export const moderatorGuard = roleGuard("MODERATOR");
export const superAdminGuard = roleGuard("SUPER_ADMIN");
