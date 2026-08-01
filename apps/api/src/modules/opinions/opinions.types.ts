import { z } from "zod";

export const CreateOpinionSchema = z.object({
  content: z.string().min(1).max(280, "Opinion must be 280 characters or less"),
});

export const ReactOpinionSchema = z.object({
  reaction_type: z.enum(["AGREE", "DISAGREE"]),
});

export const OpinionQuerySchema = z.object({
  sort: z.enum(["TOP", "NEWEST", "CONTROVERSIAL"]).default("TOP"),
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("20"),
});

export type CreateOpinionInput = z.infer<typeof CreateOpinionSchema>;
export type ReactOpinionInput = z.infer<typeof ReactOpinionSchema>;
