import { z } from "zod";

export const CreateSurveySuggestionSchema = z.object({
  category: z.enum([
    "POLITICS", "BOLLYWOOD", "SPORTS", "SOCIAL", "LOCAL", "OTHER",
  ]),
  question_text: z.string().min(10).max(200),
  context: z.string().max(500).optional(),
  target_region: z.enum(["MY_CITY", "MY_STATE", "ALL_INDIA"]).default("ALL_INDIA"),
});

export type CreateSurveySuggestionInput = z.infer<typeof CreateSurveySuggestionSchema>;
