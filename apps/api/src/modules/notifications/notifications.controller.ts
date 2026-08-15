import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { validateBody } from "../../common/pipes/validation.pipe";
import { z } from "zod";
import { notificationsService } from "./notifications.service";

const router = Router();

// Validation schemas
const FcmTokenSchema = z.object({
  fcm_token: z.string().min(1, "FCM token is required"),
});

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

// Device registration endpoints for FCM token lifecycle
router.post("/device-token", authGuard, validateBody(FcmTokenSchema), async (req, res, next) => {
  try {
    const { fcm_token } = req.body;
    await notificationsService.setFcmToken(req.user!.id, fcm_token);
    res.json({ message: "Device token registered successfully" });
  } catch (err) {
    next(err);
  }
});

router.delete("/device-token", authGuard, async (req, res, next) => {
  try {
    await notificationsService.removeFcmToken(req.user!.id);
    res.json({ message: "Device token removed successfully" });
  } catch (err) {
    next(err);
  }
});

router.get("/device-token", authGuard, async (req, res, next) => {
  try {
    const token = await notificationsService.getFcmToken(req.user!.id);
    res.json({ has_token: !!token });
  } catch (err) {
    next(err);
  }
});

export { router as notificationRouter };
