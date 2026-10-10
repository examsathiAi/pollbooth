import { Router, Request } from "express";
import { z } from "zod";
import { authGuard } from "../../common/guards/auth.guard";
import { roleGuard } from "../../common/guards/roles.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { prisma } from "../../config/database";

const router = Router();

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

function maskEmail(v?: string | null): string | null {
  if (!v) return null;
  const [name, domain] = v.split("@");
  if (!domain) return "xxxx";
  return name.slice(0, 2) + "***@" + domain;
}

function maskPhone(v?: string | null): string | null {
  if (!v) return null;
  return v.slice(0, 5) + "xxxxx";
}

router.get("/members", authGuard, roleGuard("ADMIN"), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "ALL").toUpperCase();

    const base: any = { deleted_at: null };
    if (q) {
      base.OR = [
        { username: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ];
    }
    const tabs: Record<string, any> = {
      ALL: {},
      ACTIVE: { is_banned: false },
      BANNED: { is_banned: true },
      WARNED: { moderation_status: { is: { OR: [{ warning_count: { gt: 0 } }, { comment_banned_until: { gt: new Date() } }] } } },
    };
    if (!tabs[status]) throw httpError(400, "Unknown filter");

    const [rows, total, cAll, cBanned, cWarned] = await Promise.all([
      prisma.user.findMany({
        where: { ...base, ...tabs[status] },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, username: true, name: true, email: true, phone_number: true, city: true, state: true,
          role: true, is_active: true, is_banned: true, ban_reason: true, last_active_at: true, created_at: true,
          moderation_status: { select: { warning_count: true, comment_banned_until: true, is_permanently_banned: true } },
          _count: { select: { votes: true, opinions: true } },
        },
      }),
      prisma.user.count({ where: { ...base, ...tabs[status] } }),
      prisma.user.count({ where: { ...base } }),
      prisma.user.count({ where: { ...base, ...tabs.BANNED } }),
      prisma.user.count({ where: { ...base, ...tabs.WARNED } }),
    ]);

    res.json({
      members: rows.map((u: any) => ({
        id: u.id, username: u.username, name: u.name, email: maskEmail(u.email), phone: maskPhone(u.phone_number),
        city: u.city, state: u.state, role: u.role, is_active: u.is_active, is_banned: u.is_banned, ban_reason: u.ban_reason,
        last_active_at: u.last_active_at, created_at: u.created_at,
        warnings: u.moderation_status?.warning_count || 0,
        comment_banned_until: u.moderation_status?.comment_banned_until || null,
        votes: u._count.votes, comments: u._count.opinions,
      })),
      counts: { ALL: cAll, ACTIVE: cAll - cBanned, BANNED: cBanned, WARNED: cWarned },
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

async function loadTarget(req: Request): Promise<any> {
  if (req.params.id === req.user!.id) throw httpError(400, "You cannot do this to your own account.");
  const target: any = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true, is_banned: true } });
  if (!target) throw httpError(404, "Member not found");
  if (target.role !== "USER") throw httpError(400, "This is a staff account. Remove their staff access in Team & Roles first.");
  return target;
}

const BanSchema = z.object({
  kind: z.enum(["ACCOUNT", "COMMENTS"]),
  days: z.number().int().min(1).max(365).optional(),
  reason: z.string().trim().min(3).max(300),
});

router.post("/members/:id/ban", authGuard, roleGuard("ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const input = BanSchema.parse(req.body);
    const target = await loadTarget(req);
    if (input.kind === "ACCOUNT") {
      await prisma.user.update({ where: { id: target.id }, data: { is_banned: true, ban_reason: input.reason } });
      await prisma.userModerationStatus.upsert({
        where: { user_id: target.id },
        create: { user_id: target.id, is_permanently_banned: true, ban_reason: input.reason },
        update: { is_permanently_banned: true, ban_reason: input.reason },
      });
      await audit(req, "MEMBER_ACCOUNT_BAN", target.id, { reason: input.reason });
      return res.json({ message: "Account banned. They are signed out from their next request." });
    }
    const days = input.days || 7;
    const until = new Date(Date.now() + days * 86400000);
    await prisma.userModerationStatus.upsert({
      where: { user_id: target.id },
      create: { user_id: target.id, comment_banned_until: until, ban_reason: input.reason },
      update: { comment_banned_until: until, ban_reason: input.reason },
    });
    await audit(req, "MEMBER_COMMENT_BAN", target.id, { reason: input.reason, days, until: until.toISOString() });
    res.json({ message: `Comments disabled for ${days} days. They can still vote.` });
  } catch (err) { next(err); }
});

router.post("/members/:id/unban", authGuard, roleGuard("ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 300) : null;
    const target = await loadTarget(req);
    await prisma.user.update({ where: { id: target.id }, data: { is_banned: false, ban_reason: null } });
    await prisma.userModerationStatus.updateMany({
      where: { user_id: target.id },
      data: { is_permanently_banned: false, comment_banned_until: null, ban_reason: null },
    });
    await audit(req, "MEMBER_UNBAN", target.id, { reason });
    res.json({ message: "All restrictions removed." });
  } catch (err) { next(err); }
});

export { router as adminMembersRouter };
