import { Router } from "express";
import { authGuard, optionalAuthGuard } from "../../common/guards/auth.guard";
import { rateLimiter } from "../../common/interceptors/rate-limiter";
import { validateBody, validateParams } from "../../common/pipes/validation.pipe";
import { votesService } from "./votes.service";
import { VoteSchema, GuestVoteSchema } from "./votes.types";
import { z } from "zod";

const PollIdSchema = z.object({ id: z.string().uuid() });

const router = Router();

router.post("/:id/vote", authGuard, rateLimiter.vote, validateParams(PollIdSchema), validateBody(VoteSchema), async (req, res, next) => {
  try {
    const result = await votesService.vote(req.user!.id, req.params.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/guest-vote", rateLimiter.guestVote, validateParams(PollIdSchema), validateBody(GuestVoteSchema), async (req, res, next) => {
  try {
    const result = await votesService.guestVote(req.params.id, req.body, req.ip);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/transfer-guest", authGuard, async (req, res, next) => {
  try {
    const { session_id } = req.body;
    const result = await votesService.transferGuestVotes(session_id, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as voteRouter };
