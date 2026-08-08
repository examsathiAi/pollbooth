import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { roleGuard } from "../../common/guards/roles.guard";
import { validateBody, validateParams, validateQuery } from "../../common/pipes/validation.pipe";
import { topicsService } from "./topics.service";
import { CreateTopicSchema, ListTopicsQuerySchema, TopicIdSchema, TopicPollsQuerySchema, UpdateTopicSchema } from "./topics.types";

const router = Router();

router.get("/", validateQuery(ListTopicsQuerySchema), async (req, res, next) => {
  try {
    const { parent_category, exclude_slug, active, limit } = req.query as any;
    const result = await topicsService.listTopics({
      parent_category,
      exclude_slug,
      active,
      limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:slug/polls", validateQuery(TopicPollsQuerySchema), async (req, res, next) => {
  try {
    const { sort, limit } = req.query as any;
    const result = await topicsService.getTopicPollsBySlug(req.params.slug, sort, limit);
    res.json({ polls: result });
  } catch (err) {
    next(err);
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const result = await topicsService.getTopicBySlug(req.params.slug);
    if (!result) {
      return res.status(404).json({ error: "Not Found", message: "Topic not found" });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/", authGuard, roleGuard("MODERATOR"), validateBody(CreateTopicSchema), async (req, res, next) => {
  try {
    const result = await topicsService.createTopic(req.body as any);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", authGuard, roleGuard("MODERATOR"), validateParams(TopicIdSchema), validateBody(UpdateTopicSchema), async (req, res, next) => {
  try {
    const result = await topicsService.updateTopic(req.params.id, req.body as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authGuard, roleGuard("ADMIN"), validateParams(TopicIdSchema), async (req, res, next) => {
  try {
    const result = await topicsService.deleteTopic(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as topicRouter };
