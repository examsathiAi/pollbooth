import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as crypto from "crypto";
﻿import { Router } from "express";
import { authGuard, optionalAuthGuard } from "../../common/guards/auth.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { roleGuard } from "../../common/guards/roles.guard";
import { logger } from "../../common/interceptors/logger";
import { validateBody, validateParams, validateQuery } from "../../common/pipes/validation.pipe";
import { pollsService } from "./polls.service";
import { CreatePollSchema, PollIdSchema, PollQuerySchema, PredictPollSchema } from "./polls.types";


const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT as string,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit safely prevents 413 errors
});

const router = Router();

// Public routes
router.get("/", validateQuery(PollQuerySchema), async (req, res, next) => {
  try {
    const result = await pollsService.getPolls(req.query as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/review", authGuard, roleGuard("ADMIN"), validateQuery(PollQuerySchema), async (req, res, next) => {
  try {
    const result = await pollsService.getPendingPolls(req.query as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/feed", optionalAuthGuard, validateQuery(PollQuerySchema), async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    const guestSessionId = typeof req.headers["x-pollbooth-guest-session"] === "string" ? req.headers["x-pollbooth-guest-session"] as string : undefined;
    const result = await pollsService.getPolls(req.query as any, userId, guestSessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/estimated-reach", async (req, res, next) => {
  try {
    const result = await pollsService.getEstimatedReach(req.query as any);
    res.json({ estimated_reach: result });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", optionalAuthGuard, validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    const guestSessionId = typeof req.headers["x-pollbooth-guest-session"] === "string" ? req.headers["x-pollbooth-guest-session"] as string : undefined;
    const result = await pollsService.getPollById(req.params.id, userId, guestSessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/predict", authGuard, validateParams(PollIdSchema), validateBody(PredictPollSchema), async (req, res, next) => {
  try {
    const result = await pollsService.savePrediction(req.user!.id, req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/react", authGuard, validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const { emoji } = req.body;
    if (!['😂', '🤯', '🤔', '👏'].includes(emoji)) {
      return res.status(400).json({ error: "Invalid emoji reaction" });
    }
    const result = await pollsService.togglePollReaction(req.user!.id, req.params.id, emoji);
    res.json(result);
  } catch (err) {
    next(err);
  }
});


// --- VIRAL LOOP ROUTES (Corrected for Express) ---
router.post("/:id/share", authGuard, validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const result = await pollsService.recordShare(req.user!.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/unlock-status", authGuard, validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const result = await pollsService.checkUnlockStatus(req.user!.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Admin routes

router.post("/upload", authGuard, roleGuard("ADMIN"), upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    
    const ext = req.file.originalname.split('.').pop()?.toLowerCase() || 'webp';
    const key = `poll-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME as string,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));
    
    const url = `https://images.pollbooth.in/${key}`;
    res.status(200).json({ url });
  } catch (error) {
    next(error);
  }
});

router.post("/", authGuard, roleGuard("ADMIN"), validateBody(CreatePollSchema), async (req, res, next) => {
  try {
    const result = await pollsService.createPoll(req.user!.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown poll creation error";
    const errorDetails = err instanceof Error ? err.stack : undefined;
    logger.error("Poll creation failed", {
      error: errorMessage,
      details: errorDetails,
      requestId: (req as any).requestId,
    });
    next(err);
  }
});

router.post("/:id/approve", authGuard, roleGuard("ADMIN"), rateLimiter.adminAction, validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const result = await pollsService.approvePoll(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/reject", authGuard, roleGuard("ADMIN"), rateLimiter.adminAction, validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const result = await pollsService.rejectPoll(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/publish", authGuard, roleGuard("ADMIN"), rateLimiter.adminAction, validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const result = await pollsService.publishPoll(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/archive", authGuard, roleGuard("ADMIN"), validateParams(PollIdSchema), async (req, res, next) => {
  try {
    const result = await pollsService.archivePoll(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as pollRouter };