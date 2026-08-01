import { z } from "zod";

export const ReportOpinionSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

export const ModerateOpinionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "HIDE", "WARN_USER"]),
  reason: z.string().optional(),
});

export const BanUserSchema = z.object({
  duration_days: z.number().int().min(1).max(365).optional(),
  permanent: z.boolean().default(false),
  reason: z.string().min(1).max(500),
});

export type ReportOpinionInput = z.infer<typeof ReportOpinionSchema>;
export type ModerateOpinionInput = z.infer<typeof ModerateOpinionSchema>;
export type BanUserInput = z.infer<typeof BanUserSchema>;
