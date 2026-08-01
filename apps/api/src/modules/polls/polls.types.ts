import { z } from "zod";

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
  sponsor_id: z.string().uuid().optional(),
}).strict();

export const PollIdSchema = z.object({
  id: z.string().uuid(),
});

export const PollQuerySchema = z.object({
  category: z.string().optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED", "ALL"]).default("ACTIVE"),
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("20"),
});

export type CreatePollInput = z.infer<typeof CreatePollSchema>;
