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

export function roleGuard(...minimumRoles: RoleLevel[]) {
  const required = minimumRoles.length > 0 ? minimumRoles : ["ADMIN"];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = (req.user?.role as RoleLevel | undefined) ?? "USER";
    const hasAccess = required.some((role) => hasMinimumRole(userRole, role as RoleLevel));

    if (!hasAccess) {
      const joinRoles = required.join(" or ");
      return res.status(403).json({ error: "Forbidden", message: `This action requires ${joinRoles} access` });
    }
    next();
  };
}

export const adminGuard = roleGuard("ADMIN");
export const moderatorGuard = roleGuard("MODERATOR");
export const superAdminGuard = roleGuard("SUPER_ADMIN");
