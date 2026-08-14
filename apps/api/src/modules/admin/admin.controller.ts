import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { roleGuard } from "../../common/guards/roles.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { prisma } from "../../config/database";
import { adminService } from "./admin.service";
import { civicService } from "../civic/civic.service";

const router = Router();

router.get("/dashboard", authGuard, roleGuard("ADMIN"), async (req, res, next) => {
  try {
    const result = await adminService.getDashboardStats();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/users", authGuard, roleGuard("ADMIN"), async (req, res, next) => {
  try {
    const result = await adminService.getUsers({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: req.query.search as string,
      is_banned: req.query.is_banned === "true" ? true : req.query.is_banned === "false" ? false : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/topic-balance", authGuard, roleGuard("ADMIN"), async (req, res, next) => {
  try {
    const result = await adminService.getQuestionTopicBalance();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/election-blackout", authGuard, roleGuard("SUPER_ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const { region, polling_date } = req.body as { region?: string; polling_date?: string | Date };
    const pollingDate = new Date(polling_date ?? new Date());
    const blackoutStarts = new Date(pollingDate.getTime() - 48 * 60 * 60 * 1000);

    const blackout = await prisma.electionBlackout.create({
      data: {
        region: region ?? "ALL",
        polling_date: pollingDate,
        blackout_starts: blackoutStarts,
      },
    });

    await prisma.auditLog.create({
      data: {
        user_id: req.user!.id,
        action: "CREATE_ELECTION_BLACKOUT",
        entity_type: "ELECTION_BLACKOUT",
        entity_id: blackout.id,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"] as string | undefined,
        metadata: {
          region: blackout.region,
          polling_date: blackout.polling_date.toISOString(),
          blackout_starts: blackout.blackout_starts.toISOString(),
        },
      },
    });

    res.status(201).json(blackout);
  } catch (err) {
    next(err);
  }
});

router.get("/roles", authGuard, roleGuard("SUPER_ADMIN"), async (req, res, next) => {
  try {
    const result = await adminService.getRoleUsers();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch("/roles/:userId", authGuard, roleGuard("SUPER_ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const { role } = req.body as { role?: string };
    const result = await adminService.updateUserRole(req.params.userId, role);

    await prisma.auditLog.create({
      data: {
        user_id: req.user!.id,
        action: "UPDATE_USER_ROLE",
        entity_type: "USER",
        entity_id: req.params.userId,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"] as string | undefined,
        metadata: {
          role: result.user.role,
        },
      },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/health", authGuard, roleGuard("SUPER_ADMIN"), async (req, res, next) => {
  try {
    const result = await adminService.getPlatformHealth();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Civic issues management
router.get("/civic-issues", authGuard, roleGuard("ADMIN"), async (req, res, next) => {
  try {
    const result = await civicService.getIssues(
      req.query.city as string,
      req.query.state as string,
      req.query.status as string,
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/civic-issues/:issueId/convert-to-poll", authGuard, roleGuard("ADMIN"), rateLimiter.adminAction, async (req, res, next) => {
  try {
    const { question, options } = req.body as { question?: string; options?: string[] };

    if (!options || options.length < 2) {
      return res.status(400).json({ error: "At least 2 options are required" });
    }

    const result = await civicService.convertToPoll(req.user!.id, req.params.issueId, {
      question: question,
      options,
    });

    await prisma.auditLog.create({
      data: {
        user_id: req.user!.id,
        action: "CONVERT_CIVIC_ISSUE_TO_POLL",
        entity_type: "CIVIC_ISSUE",
        entity_id: req.params.issueId,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"] as string | undefined,
        metadata: {
          poll_id: result.poll.id,
          issue_title: result.issue.title,
        },
      },
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export { router as adminRouter };
