import { z } from "zod";

export const CreatePollSchema = z.object({
  question: z.string().min(5).max(1000),
  options: z.array(z.string().min(1).max(250)).min(2).max(10),
  category: z.enum([
    "POLITICS", "CIVIC", "BOLLYWOOD", "SPORTS", "CURRENT_EVENTS",
    "LOCAL", "SOCIAL", "ECONOMY", "EDUCATION", "HEALTH", "TECH",
    "FOOD", "TRAVEL", "FASHION", "AUTO", "REAL_ESTATE", "STARTUPS",
    "WORK_CULTURE", "ENVIRONMENT", "OTHER",
  ]),
  sub_category: z.string().max(100).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  target_filters: z.record(z.any()).optional(),
  is_commercial: z.boolean().default(false),
  sponsor_id: z.string().optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE"]).optional(),
  is_active: z.boolean().optional(),
  seo_title: z.string().optional(),
  meta_description: z.string().optional(),
  slug: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  facebook_caption: z.string().optional(),
  instagram_caption: z.string().optional(),
  x_caption: z.string().optional(),
  whatsapp_share_text: z.string().optional(),
  ai_summary: z.string().optional(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  topic_names: z.array(z.string()).optional(),
}).passthrough();

export type CreatePollInput = z.infer<typeof CreatePollSchema>;

export const PollQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

export const PollIdSchema = z.object({
  id: z.string().min(1),
});

export const PredictPollSchema = z.object({
  option_index: z.number().int().min(0),
});
