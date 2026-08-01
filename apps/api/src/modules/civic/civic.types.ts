import { z } from "zod";

export const CreateCivicIssueSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().max(1000).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  category: z.enum(["INFRASTRUCTURE", "SANITATION", "ELECTRICITY", "WATER", "TRAFFIC", "SAFETY", "OTHER"]),
});

export type CreateCivicIssueInput = z.infer<typeof CreateCivicIssueSchema>;
