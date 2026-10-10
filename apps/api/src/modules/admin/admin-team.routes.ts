import { Router, Request } from "express";
import { z } from "zod";
import { authGuard } from "../../common/guards/auth.guard";
import { roleGuard } from "../../common/guards/roles.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { prisma } from "../../config/database";

const router = Router();

const STAFF_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"] as const;

function httpError(status: number, message: string) {
  const e: any = new Error(message);
  e.status = status;
  return e;
}

async function audit(req: Request, action: string, entityId: string, metadata: any) {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: req.user!.id,
        action,
        entity_type: "USER",
        entity_id: entityId,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"] as string | undefined,
        metadata,
      },
    });
  } catch (e) {
    // an audit failure must never block the action itself
  }
}

// Would this change leave the platform without any active Super Admin?
async function otherSuperAdmins(excludeId: string): Promise<number> {
  return prisma.user.count({
    where: { role: "SUPER_ADMIN" as any, is_active: true, is_banned: false, id: { not: excludeId } },
  });
}

router.get("/team", authGuard, roleGuard("SUPER_ADMIN"), async (req, res, next) => {
  try {
    const rows = await prisma.user.findMany({
      where: { role: { not: "USER" as any } },
      select: { id: true, username: true, name: true, email: true, role: true, is_active: true, is_banned: true, last_active_at: true, created_at: true },
      orderBy: [{ role: "desc" }, { created_at: "asc" }],
    });
    res.json({ team: rows.map((u: any) => ({ ...u, is_you: u.id === req.user!.id })) });
  } catch (err) { next(err); }
});

const AddSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(STAFF_ROLES),
});

router.post("/team/add", authGuard, roleGuard("SUPER_ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const input = AddSchema.parse(req.body);
    const user: any = await prisma.user.findFirst({ where: { email: input.email }, select: { id: true, username: true, role: true, is_active: true, is_banned: true } });
    if (!user) {
      throw httpError(404, "No account uses this email yet. Ask them to sign up on pollbooth.in with this email first, then add them here.");
    }
    if (user.is_banned || !user.is_active) throw httpError(400, "This account is banned or inactive, so it cannot be given staff access.");
    if (user.role !== "USER") throw httpError(400, "This person is already on the team. Change their role from the list instead.");
    await prisma.user.update({ where: { id: user.id }, data: { role: input.role as any } });
    await audit(req, "TEAM_ADD", user.id, { email: input.email, role: input.role });
    res.status(201).json({ message: "Added to the team", id: user.id, role: input.role });
  } catch (err) { next(err); }
});

const RoleSchema = z.object({ role: z.enum(STAFF_ROLES), reason: z.string().max(300).optional() });

router.patch("/team/:id", authGuard, roleGuard("SUPER_ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const input = RoleSchema.parse(req.body);
    if (req.params.id === req.user!.id) throw httpError(400, "You cannot change your own role. Ask another Super Admin.");
    const target: any = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true } });
    if (!target) throw httpError(404, "Person not found");
    if (target.role === "USER") throw httpError(400, "This person is not on the team. Add them first.");
    if (target.role === input.role) return res.json({ message: "No change" });
    if (target.role === "SUPER_ADMIN" && (await otherSuperAdmins(target.id)) < 1) {
      throw httpError(400, "At least one active Super Admin must remain.");
    }
    await prisma.user.update({ where: { id: target.id }, data: { role: input.role as any } });
    await audit(req, "TEAM_ROLE_CHANGE", target.id, { from: target.role, to: input.role, reason: input.reason || null });
    res.json({ message: "Role updated", role: input.role });
  } catch (err) { next(err); }
});

router.post("/team/:id/remove", authGuard, roleGuard("SUPER_ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 300) : null;
    if (req.params.id === req.user!.id) throw httpError(400, "You cannot remove your own access. Ask another Super Admin.");
    const target: any = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true } });
    if (!target) throw httpError(404, "Person not found");
    if (target.role === "USER") throw httpError(400, "This person is not on the team.");
    if (target.role === "SUPER_ADMIN" && (await otherSuperAdmins(target.id)) < 1) {
      throw httpError(400, "At least one active Super Admin must remain.");
    }
    await prisma.user.update({ where: { id: target.id }, data: { role: "USER" as any } });
    await audit(req, "TEAM_REMOVE", target.id, { was: target.role, reason });
    res.json({ message: "Staff access removed. It takes effect immediately." });
  } catch (err) { next(err); }
});

export { router as adminTeamRouter };
