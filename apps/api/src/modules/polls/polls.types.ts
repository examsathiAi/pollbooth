import { z } from "zod";

const faqEntrySchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

export const CreatePollSchema = z.object({
  question: z.string().min(10).max(500),
  options: z.array(z.string().min(1).max(100)).min(2).max(5),
  category: z.enum([
    "POLITICS", "CIVIC", "BOLLYWOOD", "SPORTS", "CURRENT_EVENTS",
    "LOCAL", "SOCIAL", "ECONOMY", "EDUCATION", "HEALTH", "TECH",
    "FOOD", "TRAVEL", "FASHION", "AUTO", "REAL_ESTATE", "STARTUPS",
    "WORK_CULTURE", "ENVIRONMENT", "OTHER",
  ]),
  sub_category: z.string().max(50).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  target_filters: z.object({
    age_brackets: z.array(z.string()).optional(),
    genders: z.array(z.string()).optional(),
    states: z.array(z.string()).optional(),
    cities: z.array(z.string()).optional(),
    city_tiers: z.array(z.string()).optional(),
    income_brackets: z.array(z.string()).optional(),
    education: z.array(z.string()).optional(),
    employment: z.array(z.string()).optional(),
    vehicle_ownership: z.array(z.string()).optional(),
  }).optional(),
  is_commercial: z.boolean().default(false),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE"]).optional(),
  is_active: z.boolean().optional(),
  sponsor_id: z.string().uuid().optional(),
  seo_title: z.string().max(60).optional(),
  meta_description: z.string().max(160).optional(),
  slug: z.string().max(100).optional(),
  keywords: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  facebook_caption: z.string().max(400).optional(),
  instagram_caption: z.string().max(300).optional(),
  x_caption: z.string().max(280).optional(),
  whatsapp_share_text: z.string().max(200).optional(),
  ai_summary: z.string().optional(),
  faq: z.array(faqEntrySchema).optional(),
  og_title: z.string().max(60).optional(),
  og_description: z.string().max(200).optional(),
  topic_names: z.array(z.string().trim().min(1)).optional(),
}).strict();

export const PollIdSchema = z.object({
  id: z.string().uuid(),
});

export const PollQuerySchema = z.object({
  category: z.string().optional(),
  status: z.enum(["ACTIVE", "DRAFT", "PENDING_REVIEW", "ARCHIVED", "ALL"]).default("ACTIVE"),
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("20"),
  search: z.string().optional(),
});

export const PredictPollSchema = z.object({
  predicted_percentage: z.number().int().min(0).max(100),
});

export type CreatePollInput = z.infer<typeof CreatePollSchema>;
