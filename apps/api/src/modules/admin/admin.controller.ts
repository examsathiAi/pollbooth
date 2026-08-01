import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { adminGuard } from "../../common/guards/roles.guard";
import { adminService } from "./admin.service";

const router = Router();

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

export { router as adminRouter };
