import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { adminGuard } from "../../common/guards/roles.guard";
import { adminService } from "./admin.service";

const router = Router();
const prisma = new PrismaClient();

router.get("/dashboard", authGuard, adminGuard, async (req, res, next) => {
  try {
    const result = await adminService.getDashboardStats();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/users", authGuard, adminGuard, async (req, res, next) => {
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

router.get("/topic-balance", authGuard, adminGuard, async (req, res, next) => {
  try {
    const result = await adminService.getQuestionTopicBalance();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/election-blackout", authGuard, adminGuard, async (req, res, next) => {
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

    res.status(201).json(blackout);
  } catch (err) {
    next(err);
  }
});

export { router as adminRouter };
