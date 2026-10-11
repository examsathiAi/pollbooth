import { Router, Request } from "express";
import { z } from "zod";
import { authGuard } from "../../common/guards/auth.guard";
import { roleGuard } from "../../common/guards/roles.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { prisma } from "../../config/database";

const router = Router();
const db: any = prisma; // grouped counts are easier without the generated types
const MIN_GROUP = 10; // groups smaller than this are never shown (privacy)

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
        entity_type: "POLL",
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

function sinceDay(days: number): Date {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000 - days * 86400000).toISOString().slice(0, 10);
  return new Date(d + "T00:00:00.000Z");
}

// ---------- shares and traffic ----------
router.get("/traffic/shares", authGuard, roleGuard("ADMIN"), async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = sinceDay(days);

    const grouped: any[] = await db.trafficDaily.groupBy({
      by: ["src", "card", "kind"],
      where: { day: { gte: since }, kind: { in: ["VISIT", "VOTE", "SIGNIN"] } },
      _sum: { count: true },
    });
    const map = new Map<string, any>();
    for (const g of grouped) {
      const key = g.src + "|" + g.card;
      const row = map.get(key) || { src: g.src, card: g.card, visits: 0, votes: 0, signins: 0 };
      const n = g._sum.count || 0;
      if (g.kind === "VISIT") row.visits += n;
      if (g.kind === "VOTE") row.votes += n;
      if (g.kind === "SIGNIN") row.signins += n;
      map.set(key, row);
    }
    const rows = Array.from(map.values()).sort((a, b) => b.visits - a.visits);

    const topRaw: any[] = await db.trafficDaily.groupBy({
      by: ["poll_key"],
      where: { day: { gte: since }, kind: "VISIT", src: { not: "direct" }, poll_key: { not: "" } },
      _sum: { count: true },
      orderBy: { _sum: { count: "desc" } },
      take: 10,
    });
    const polls = await prisma.poll.findMany({ where: { id: { in: topRaw.map((t) => t.poll_key) } }, select: { id: true, question: true } });
    const top_polls = topRaw.map((t) => ({ poll_id: t.poll_key, question: polls.find((p) => p.id === t.poll_key)?.question || "(removed poll)", visits: t._sum.count || 0 }));

    const dailyRaw: any[] = await db.trafficDaily.groupBy({
      by: ["day"],
      where: { day: { gte: since }, kind: "VISIT", src: { not: "direct" } },
      _sum: { count: true },
      orderBy: { day: "asc" },
    });
    const daily = dailyRaw.map((d) => ({ day: new Date(d.day).toISOString().slice(0, 10), visits: d._sum.count || 0 }));

    res.json({ days, rows, top_polls, daily });
  } catch (err) { next(err); }
});

// ---------- sponsors ----------
router.get("/traffic/sponsors", authGuard, roleGuard("ADMIN"), async (_req, res, next) => {
  try {
    const polls = await prisma.poll.findMany({
      where: { is_commercial: true },
      orderBy: { created_at: "desc" },
      take: 100,
      select: {
        id: true, question: true, status: true, is_active: true, image_url: true, created_at: true,
        _count: { select: { votes: true, opinions: true } },
      },
    });
    const ids = polls.map((p) => p.id);
    const views: any[] = await db.trafficDaily.groupBy({ by: ["poll_key"], where: { poll_key: { in: ids }, kind: "IMPRESSION" }, _sum: { count: true } });
    const visits: any[] = await db.trafficDaily.groupBy({ by: ["poll_key"], where: { poll_key: { in: ids }, kind: "VISIT", src: { not: "direct" } }, _sum: { count: true } });
    const camps = await prisma.adPlacement.findMany({ where: { poll_id: { in: ids } }, orderBy: { created_at: "desc" } });

    res.json({
      sponsors: polls.map((p) => {
        const v = views.find((x) => x.poll_key === p.id)?._sum.count || 0;
        const c: any = camps.find((x) => x.poll_id === p.id) || null;
        return {
          id: p.id, question: p.question, status: p.status, is_active: p.is_active, image_url: p.image_url, created_at: p.created_at,
          views: v, share_visits: visits.find((x) => x.poll_key === p.id)?._sum.count || 0,
          votes: p._count.votes, comments: p._count.opinions,
          vote_rate: v > 0 ? Math.round((p._count.votes / v) * 1000) / 10 : null,
          client_name: c?.client_name || null,
        };
      }),
    });
  } catch (err) { next(err); }
});

function tally(values: (string | null | undefined)[], total: number) {
  const m = new Map<string, number>();
  for (const v of values) { const k = (v || "Unknown").trim() || "Unknown"; m.set(k, (m.get(k) || 0) + 1); }
  const shown = Array.from(m.entries()).filter(([, n]) => n >= MIN_GROUP).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const shownTotal = shown.reduce((s, [, n]) => s + n, 0);
  return {
    groups: shown.map(([name, n]) => ({ name, count: n, pct: total > 0 ? Math.round((n / total) * 1000) / 10 : 0 })),
    small_groups_hidden: total - shownTotal,
  };
}

router.get("/traffic/sponsors/:pollId", authGuard, roleGuard("ADMIN"), async (req, res, next) => {
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: req.params.pollId },
      select: { id: true, question: true, status: true, created_at: true, is_commercial: true, _count: { select: { votes: true, opinions: true } } },
    });
    if (!poll || !poll.is_commercial) throw httpError(404, "Sponsored poll not found");

    const sum = async (kind: string, extra: any = {}) => {
      const r: any = await db.trafficDaily.aggregate({ where: { poll_key: poll.id, kind, ...extra }, _sum: { count: true } });
      return r._sum.count || 0;
    };
    const views = await sum("IMPRESSION");
    const shareVisits = await sum("VISIT", { src: { not: "direct" } });

    const dailyRaw: any[] = await db.trafficDaily.groupBy({ by: ["day"], where: { poll_key: poll.id, kind: "IMPRESSION" }, _sum: { count: true }, orderBy: { day: "asc" } });
    const daily = dailyRaw.map((d) => ({ day: new Date(d.day).toISOString().slice(0, 10), views: d._sum.count || 0 }));

    const voters: any[] = await prisma.vote.findMany({
      where: { poll_id: poll.id },
      take: 20000,
      select: { user: { select: { city: true, profile: { select: { age_bracket: true } } } } },
    });
    const cities = tally(voters.map((v) => v.user?.city), voters.length);
    const ages = tally(voters.map((v) => v.user?.profile?.age_bracket), voters.length);

    const camp: any = await prisma.adPlacement.findFirst({ where: { poll_id: poll.id }, orderBy: { created_at: "desc" } });

    res.json({
      poll: { id: poll.id, question: poll.question, status: poll.status, created_at: poll.created_at },
      campaign: camp ? { client_name: camp.client_name, start_date: camp.start_date, end_date: camp.end_date, amount_paid: camp.amount_paid } : null,
      totals: {
        views, share_visits: shareVisits, votes: poll._count.votes, comments: poll._count.opinions,
        vote_rate: views > 0 ? Math.round((poll._count.votes / views) * 1000) / 10 : null,
      },
      daily, cities, ages, min_group_size: MIN_GROUP,
    });
  } catch (err) { next(err); }
});

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional();
const CampaignSchema = z.object({
  client_name: z.string().trim().min(1).max(100),
  start_date: DateStr,
  end_date: DateStr,
  amount_paid: z.number().int().min(0).max(100000000).nullable().optional(),
});

router.put("/traffic/sponsors/:pollId/campaign", authGuard, roleGuard("ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const input = CampaignSchema.parse(req.body);
    const poll = await prisma.poll.findUnique({ where: { id: req.params.pollId }, select: { id: true, is_commercial: true } });
    if (!poll || !poll.is_commercial) throw httpError(404, "Sponsored poll not found");
    const data: any = {
      client_name: input.client_name,
      start_date: input.start_date ? new Date(input.start_date + "T00:00:00.000Z") : null,
      end_date: input.end_date ? new Date(input.end_date + "T00:00:00.000Z") : null,
      amount_paid: input.amount_paid ?? null,
    };
    const existing = await prisma.adPlacement.findFirst({ where: { poll_id: poll.id }, orderBy: { created_at: "desc" } });
    if (existing) await prisma.adPlacement.update({ where: { id: existing.id }, data });
    else await prisma.adPlacement.create({ data: { ...data, poll_id: poll.id, ad_type: "SPONSORED_POLL" } });
    await audit(req, "SPONSOR_CAMPAIGN_SAVE", poll.id, { client_name: input.client_name, amount_paid: input.amount_paid ?? null });
    res.json({ message: "Campaign saved." });
  } catch (err) { next(err); }
});

export { router as adminTrafficRouter };
