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

export const TopicIdSchema = z.object({
  id: z.string().uuid(),
});
