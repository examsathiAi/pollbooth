import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { notificationsService } from "./notifications.service";

const router = Router();

router.get("/", authGuard, async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await notificationsService.getNotifications(req.user!.id, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/read", authGuard, async (req, res, next) => {
  try {
    const result = await notificationsService.markAsRead(req.user!.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/read-all", authGuard, async (req, res, next) => {
  try {
    const result = await notificationsService.markAllAsRead(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as notificationRouter };
