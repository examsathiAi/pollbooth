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
        entity_type: "GRIEVANCE",
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

const OPEN = ["NEW", "IN_PROGRESS"];

router.get("/grievances", authGuard, roleGuard("ADMIN"), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const q = String(req.query.q || "").trim();
    const tab = String(req.query.tab || "OPEN").toUpperCase();
    const kind = String(req.query.kind || "").toUpperCase();
    const now = new Date();

    const tabs: Record<string, any> = {
      OPEN: { status: { in: OPEN } },
      NEW: { status: "NEW" },
      OVERDUE: { status: { in: OPEN }, due_at: { lt: now } },
      CLOSED: { status: { in: ["RESOLVED", "REJECTED"] } },
      ALL: {},
    };
    if (!tabs[tab]) throw httpError(400, "Unknown filter");

    const and: any[] = [tabs[tab]];
    if (kind && kind !== "ALL") and.push({ kind });
    if (q) {
      const or: any[] = [
        { name: { contains: q, mode: "insensitive" } },
        { contact: { contains: q, mode: "insensitive" } },
        { message: { contains: q, mode: "insensitive" } },
      ];
      const m = q.match(/^(?:grv-?)?(\d{1,9})$/i);
      if (m) or.push({ ticket_no: Number(m[1]) });
      and.push({ OR: or });
    }
    const where = { AND: and };

    const [rows, total, cOpen, cNew, cOver, cClosed, cAll] = await Promise.all([
      prisma.grievance.findMany({ where, orderBy: { created_at: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.grievance.count({ where }),
      prisma.grievance.count({ where: tabs.OPEN }),
      prisma.grievance.count({ where: tabs.NEW }),
      prisma.grievance.count({ where: tabs.OVERDUE }),
      prisma.grievance.count({ where: tabs.CLOSED }),
      prisma.grievance.count(),
    ]);

    res.json({
      items: rows.map((g: any) => ({
        id: g.id,
        ref: "GRV-" + String(g.ticket_no).padStart(5, "0"),
        kind: g.kind,
        name: g.name,
        contact: g.contact,
        message: g.message,
        status: g.status,
        due_at: g.due_at,
        acknowledged_at: g.acknowledged_at,
        resolution: g.resolution,
        resolved_at: g.resolved_at,
        created_at: g.created_at,
        signed_in: !!g.user_id,
        overdue: OPEN.includes(g.status) && new Date(g.due_at) < now,
      })),
      counts: { OPEN: cOpen, NEW: cNew, OVERDUE: cOver, CLOSED: cClosed, ALL: cAll },
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

const ActSchema = z.object({
  action: z.enum(["ACKNOWLEDGE", "RESOLVE", "REJECT"]),
  note: z.string().trim().max(2000).optional(),
});

router.patch("/grievances/:id", authGuard, roleGuard("ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const input = ActSchema.parse(req.body);
    const g = await prisma.grievance.findUnique({ where: { id: req.params.id } });
    if (!g) throw httpError(404, "Request not found");
    if (!OPEN.includes(g.status)) throw httpError(400, "This request is already closed.");
    const now = new Date();

    if (input.action === "ACKNOWLEDGE") {
      if (g.status !== "NEW") throw httpError(400, "Already acknowledged.");
      await prisma.grievance.update({ where: { id: g.id }, data: { status: "IN_PROGRESS", acknowledged_at: now } });
      await audit(req, "GRIEVANCE_ACKNOWLEDGE", g.id, {});
      return res.json({ message: "Marked as acknowledged." });
    }

    if (!input.note || input.note.length < 5) throw httpError(400, "Please write what was done (at least 5 characters).");
    await prisma.grievance.update({
      where: { id: g.id },
      data: {
        status: input.action === "RESOLVE" ? "RESOLVED" : "REJECTED",
        resolution: input.note,
        resolved_by: req.user!.id,
        resolved_at: now,
        acknowledged_at: g.acknowledged_at || now,
      },
    });
    await audit(req, input.action === "RESOLVE" ? "GRIEVANCE_RESOLVE" : "GRIEVANCE_REJECT", g.id, { note: input.note });
    res.json({ message: input.action === "RESOLVE" ? "Closed as resolved." : "Closed as rejected." });
  } catch (err) { next(err); }
});

export { router as adminGrievancesRouter };
