import { Router, Request } from "express";
import { z } from "zod";
import { authGuard } from "../../common/guards/auth.guard";
import { roleGuard } from "../../common/guards/roles.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { prisma } from "../../config/database";

const router = Router();

const HOUR = 3600 * 1000;
// polling_date is stored as midnight UTC of the polling day (05:30 IST).
// The IST day starts 5.5h earlier and ends 18.5h later.
const IST_DAY_START = 5.5 * HOUR;
const IST_DAY_END = 18.5 * HOUR;

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
        entity_type: "ELECTION_BLACKOUT",
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

function statusOf(b: any, now: number): string {
  if (!b.active) return "OFF";
  if (now < new Date(b.blackout_starts).getTime()) return "UPCOMING";
  if (now <= new Date(b.polling_date).getTime() + IST_DAY_END) return "ACTIVE";
  return "ENDED";
}

router.get("/blackouts", authGuard, roleGuard("ADMIN"), async (_req, res, next) => {
  try {
    const rows = await prisma.electionBlackout.findMany({ orderBy: { polling_date: "desc" }, take: 100 });
    const now = Date.now();
    res.json({
      blackouts: rows.map((b: any) => ({
        id: b.id,
        region: b.region,
        polling_date: b.polling_date,
        blackout_starts: b.blackout_starts,
        blackout_ends: new Date(new Date(b.polling_date).getTime() + IST_DAY_END),
        active: b.active,
        status: statusOf(b, now),
        created_at: b.created_at,
      })),
    });
  } catch (err) { next(err); }
});

const CreateSchema = z.object({
  polling_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker"),
  first_polling_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.post("/blackouts", authGuard, roleGuard("SUPER_ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const input = CreateSchema.parse(req.body);
    const last = new Date(input.polling_date + "T00:00:00.000Z");
    const first = new Date((input.first_polling_date || input.polling_date) + "T00:00:00.000Z");
    if (isNaN(last.getTime()) || isNaN(first.getTime())) throw httpError(400, "That date is not valid.");
    if (first.getTime() > last.getTime()) throw httpError(400, "The first polling day cannot be after the last polling day.");
    if (last.getTime() + IST_DAY_END < Date.now()) throw httpError(400, "That polling day has already passed.");

    const starts = new Date(first.getTime() - IST_DAY_START - 48 * HOUR);
    const dup = await prisma.electionBlackout.findFirst({ where: { region: "ALL", polling_date: last, active: true } });
    if (dup) throw httpError(409, "A blackout for this polling day already exists.");

    const created = await prisma.electionBlackout.create({
      data: { region: "ALL", polling_date: last, blackout_starts: starts, active: true },
    });
    await audit(req, "CREATE_ELECTION_BLACKOUT", created.id, {
      region: "ALL", polling_date: input.polling_date, first_polling_date: input.first_polling_date || null, blackout_starts: starts.toISOString(),
    });
    res.status(201).json({ message: "Blackout saved. Political polls are hidden from the moment it starts." });
  } catch (err) { next(err); }
});

const ToggleSchema = z.object({
  active: z.boolean(),
  reason: z.string().trim().min(3).max(300),
});

router.patch("/blackouts/:id", authGuard, roleGuard("SUPER_ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const input = ToggleSchema.parse(req.body);
    const existing = await prisma.electionBlackout.findUnique({ where: { id: req.params.id } });
    if (!existing) throw httpError(404, "Blackout not found");
    await prisma.electionBlackout.update({ where: { id: existing.id }, data: { active: input.active } });
    await audit(req, input.active ? "ELECTION_BLACKOUT_ON" : "ELECTION_BLACKOUT_OFF", existing.id, { reason: input.reason });
    res.json({ message: input.active ? "Blackout switched back on." : "Blackout switched off." });
  } catch (err) { next(err); }
});

export { router as adminBlackoutRouter };
