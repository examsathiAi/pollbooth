import { Router, Request } from "express";
import { z } from "zod";
import { authGuard } from "../../common/guards/auth.guard";
import { roleGuard } from "../../common/guards/roles.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { prisma } from "../../config/database";
import { adminService } from "./admin.service";
import { moderationService } from "../moderation/moderation.service";

const router = Router();

const CATEGORIES = [
  "POLITICS", "CIVIC", "BOLLYWOOD", "SPORTS", "CURRENT_EVENTS", "LOCAL",
  "SOCIAL", "ECONOMY", "EDUCATION", "HEALTH", "TECH", "FOOD", "TRAVEL",
  "FASHION", "AUTO", "REAL_ESTATE", "STARTUPS", "WORK_CULTURE", "ENVIRONMENT", "OTHER",
] as const;

function httpError(status: number, message: string) {
  const e: any = new Error(message);
  e.status = status;
  return e;
}

async function audit(req: Request, action: string, entityType: string, entityId: string | null, metadata: any) {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: req.user!.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"] as string | undefined,
        metadata,
      },
    });
  } catch (e) {
    // an audit failure must never block the admin action itself
  }
}

function pageParams(req: Request) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  return { page, limit };
}

// ---------- small counters for menu badges ----------
router.get("/counts", authGuard, roleGuard("MODERATOR"), async (_req, res, next) => {
  try {
    const [pendingPolls, pendingReports, pendingCivic] = await Promise.all([
      prisma.poll.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.civicIssue.count({ where: { status: "PENDING" } }),
    ]);
    res.json({ pending_polls: pendingPolls, pending_reports: pendingReports, pending_civic: pendingCivic });
  } catch (err) { next(err); }
});

// ---------- polls: list with search + filters ----------
const TAB_WHERE: Record<string, any> = {
  ALL: {},
  REVIEW: { status: "PENDING_REVIEW" },
  LIVE: { status: "ACTIVE", is_active: true },
  CLOSED: { status: "CLOSED", is_active: true },
  HIDDEN: { is_active: false, status: { in: ["ACTIVE", "CLOSED"] } },
};

router.get("/polls/manage", authGuard, roleGuard("ADMIN"), async (req, res, next) => {
  try {
    const { page, limit } = pageParams(req);
    const q = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();
    const tab = String(req.query.tab || "ALL").toUpperCase();
    if (!TAB_WHERE[tab]) throw httpError(400, "Unknown tab");

    const base: any = {};
    if (q) base.question = { contains: q, mode: "insensitive" };
    if (category && category !== "ALL") base.category = category;

    const [rows, total, cAll, cReview, cLive, cClosed, cHidden] = await Promise.all([
      prisma.poll.findMany({
        where: { ...base, ...TAB_WHERE[tab] },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, question: true, category: true, status: true, is_active: true,
          end_date: true, created_at: true, image_url: true, slug: true, is_commercial: true,
          _count: { select: { votes: true, guest_votes: true, opinions: true } },
        },
      }),
      prisma.poll.count({ where: { ...base, ...TAB_WHERE[tab] } }),
      prisma.poll.count({ where: { ...base } }),
      prisma.poll.count({ where: { ...base, ...TAB_WHERE.REVIEW } }),
      prisma.poll.count({ where: { ...base, ...TAB_WHERE.LIVE } }),
      prisma.poll.count({ where: { ...base, ...TAB_WHERE.CLOSED } }),
      prisma.poll.count({ where: { ...base, ...TAB_WHERE.HIDDEN } }),
    ]);

    res.json({
      polls: rows.map((p: any) => ({
        id: p.id, question: p.question, category: p.category, status: p.status, is_active: p.is_active,
        end_date: p.end_date, created_at: p.created_at, image_url: p.image_url, slug: p.slug,
        is_commercial: p.is_commercial,
        votes: p._count.votes + p._count.guest_votes,
        opinions: p._count.opinions,
      })),
      counts: { ALL: cAll, REVIEW: cReview, LIVE: cLive, CLOSED: cClosed, HIDDEN: cHidden },
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

router.get("/polls/:id", authGuard, roleGuard("ADMIN"), async (req, res, next) => {
  try {
    const poll: any = await prisma.poll.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { votes: true, guest_votes: true, opinions: true } } },
    });
    if (!poll) throw httpError(404, "Poll not found");
    const votes = poll._count.votes + poll._count.guest_votes;
    const { _count, ...rest } = poll;
    res.json({ poll: { ...rest, votes, opinions: _count.opinions, options_locked: votes > 0 } });
  } catch (err) { next(err); }
});

// ---------- polls: edit (draft, review or already published) ----------
const optText = z.string().max(5000).nullable().optional();
const EditPollSchema = z.object({
  question: z.string().trim().min(5).max(1000).optional(),
  options: z.array(z.string().trim().min(1).max(250)).min(2).max(10).optional(),
  category: z.enum(CATEGORIES).optional(),
  end_date: z.string().datetime().nullable().optional(),
  image_url: z.string().max(500).refine((v) => v.startsWith("https://images.pollbooth.in/"), { message: "Image must be hosted on images.pollbooth.in" }).nullable().optional(),
  is_commercial: z.boolean().optional(),
  seo_title: z.string().max(60).nullable().optional(),
  meta_description: z.string().max(160).nullable().optional(),
  og_title: z.string().max(60).nullable().optional(),
  og_description: optText,
  keywords: z.array(z.string().max(100)).max(30).optional(),
  hashtags: z.array(z.string().max(100)).max(30).optional(),
  facebook_caption: optText,
  instagram_caption: optText,
  x_caption: optText,
  whatsapp_share_text: optText,
  ai_summary: optText,
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).max(20).optional(),
}).strict();

router.patch("/polls/:id", authGuard, roleGuard("ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const input: any = EditPollSchema.parse(req.body);
    const existing: any = await prisma.poll.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { votes: true, guest_votes: true } } },
    });
    if (!existing) throw httpError(404, "Poll not found");

    const votes = existing._count.votes + existing._count.guest_votes;
    if (input.options && votes > 0) {
      const old: string[] = existing.options || [];
      const keepsOld = input.options.length >= old.length && old.every((o, i) => input.options[i] === o);
      if (!keepsOld) {
        throw httpError(400, "Voting has started, so existing options cannot be removed, renamed or reordered. You can only add new options at the end.");
      }
    }

    const data: any = {};
    const changes: Record<string, { from: any; to: any }> = {};
    for (const key of Object.keys(input)) {
      let next = input[key];
      if (key === "end_date") next = next ? new Date(next) : null;
      const prev = existing[key];
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        data[key] = next;
        changes[key] = { from: prev, to: next };
      }
    }

    if (Object.keys(data).length === 0) {
      return res.json({ message: "No changes", changed: [] });
    }

    await prisma.poll.update({ where: { id: existing.id }, data });
    await audit(req, "EDIT_POLL", "POLL", existing.id, { changes, votes_at_edit: votes });
    res.json({ message: "Poll updated", changed: Object.keys(changes) });
  } catch (err) { next(err); }
});

// ---------- polls: close / reopen / extend / hide / unhide ----------
const LifecycleSchema = z.object({
  action: z.enum(["CLOSE", "REOPEN", "EXTEND", "HIDE", "UNHIDE"]),
  endDate: z.string().datetime().optional(),
  reason: z.string().max(300).optional(),
});

router.patch("/polls/:id/lifecycle", authGuard, roleGuard("ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const input = LifecycleSchema.parse(req.body);
    const before: any = await prisma.poll.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, is_active: true, end_date: true },
    });
    if (!before) throw httpError(404, "Poll not found");
    if (!["ACTIVE", "CLOSED"].includes(before.status)) {
      throw httpError(400, "This poll is not published yet. Use Approve or Reject in the review queue.");
    }
    if (input.action === "EXTEND") {
      if (!input.endDate || new Date(input.endDate).getTime() <= Date.now()) {
        throw httpError(400, "Choose an end date in the future.");
      }
    }
    const updated: any = await adminService.updatePollLifecycle(before.id, { action: input.action, endDate: input.endDate });
    await audit(req, "POLL_" + input.action, "POLL", before.id, {
      reason: input.reason || null,
      before: { status: before.status, is_active: before.is_active, end_date: before.end_date },
      after: { status: updated.status, is_active: updated.is_active, end_date: updated.end_date },
    });
    res.json({ message: "Done", poll: updated });
  } catch (err) { next(err); }
});

// ---------- comments: full inbox with search + filters ----------
router.get("/comments", authGuard, roleGuard("MODERATOR"), async (req, res, next) => {
  try {
    const { page, limit } = pageParams(req);
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "ALL").toUpperCase();

    const base: any = {};
    if (q) {
      base.OR = [
        { content: { contains: q, mode: "insensitive" } },
        { user: { username: { contains: q, mode: "insensitive" } } },
      ];
    }
    const tabs: Record<string, any> = {
      ALL: {},
      REPORTED: { reports: { some: { status: "PENDING" } } },
      HIDDEN: { is_hidden: true },
      VISIBLE: { is_hidden: false },
    };
    if (!tabs[status]) throw httpError(400, "Unknown status");

    const [rows, total, cAll, cReported, cHidden] = await Promise.all([
      prisma.opinion.findMany({
        where: { ...base, ...tabs[status] },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, username: true, city: true } },
          poll: { select: { id: true, question: true } },
          reports: { where: { status: "PENDING" }, select: { reason: true }, take: 5 },
        },
      }),
      prisma.opinion.count({ where: { ...base, ...tabs[status] } }),
      prisma.opinion.count({ where: { ...base } }),
      prisma.opinion.count({ where: { ...base, ...tabs.REPORTED } }),
      prisma.opinion.count({ where: { ...base, ...tabs.HIDDEN } }),
    ]);

    res.json({
      comments: rows.map((o: any) => ({
        id: o.id, content: o.content, is_hidden: o.is_hidden, moderation_status: o.moderation_status,
        created_at: o.created_at, user: o.user, poll: o.poll,
        report_reasons: o.reports.map((r: any) => r.reason || "No reason given"),
      })),
      counts: { ALL: cAll, REPORTED: cReported, HIDDEN: cHidden, VISIBLE: cAll - cHidden },
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

const CommentActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "WARN_USER"]),
  reason: z.string().max(300).optional(),
});

router.post("/comments/:id/action", authGuard, roleGuard("MODERATOR"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const input = CommentActionSchema.parse(req.body);
    const exists = await prisma.opinion.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!exists) throw httpError(404, "Comment not found");
    const result = await moderationService.moderateOpinion(req.user!.id, req.params.id, input as any);
    res.json(result);
  } catch (err) { next(err); }
});

// ---------- activity log (who did what) ----------
router.get("/audit", authGuard, roleGuard("SUPER_ADMIN"), async (req, res, next) => {
  try {
    const { page, limit } = pageParams(req);
    const q = String(req.query.q || "").trim();
    const where: any = {};
    if (q) where.OR = [{ action: { contains: q, mode: "insensitive" } }, { entity_type: { contains: q, mode: "insensitive" } }];
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, orderBy: { created_at: "desc" }, skip: (page - 1) * limit, take: limit,
        include: { user: { select: { username: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({
      logs: rows.map((r: any) => ({
        id: r.id, action: r.action, entity_type: r.entity_type, entity_id: r.entity_id,
        metadata: r.metadata, created_at: r.created_at,
        by: r.user ? (r.user.username || "staff") + " (" + r.user.role + ")" : "system",
      })),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

export { router as adminConsoleRouter };
