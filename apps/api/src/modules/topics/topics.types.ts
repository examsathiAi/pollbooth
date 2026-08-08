import { z } from "zod";

export const CreateTopicSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL-safe"),
  description: z.string().trim().max(500).optional(),
  parent_category: z.string().trim().max(50).optional(),
});

export const UpdateTopicSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL-safe").optional(),
  description: z.string().trim().max(500).optional(),
  parent_category: z.string().trim().max(50).optional(),
});

export const ListTopicsQuerySchema = z.object({
  parent_category: z.string().trim().max(50).optional(),
  exclude_slug: z.string().trim().max(100).optional(),
  active: z.preprocess((value) => {
    if (typeof value === "string") return value.toLowerCase() === "true";
    return value;
  }, z.boolean().optional()),
  limit: z.preprocess((value) => Number(value), z.number().int().min(1).max(100).optional()),
});

export const TopicPollsQuerySchema = z.object({
  sort: z.enum(["latest", "trending", "most-voted"]).default("latest"),
  limit: z.preprocess((value) => Number(value), z.number().int().min(1).max(12).default(6)),
});

export const TopicIdSchema = z.object({
  id: z.string().uuid(),
});
