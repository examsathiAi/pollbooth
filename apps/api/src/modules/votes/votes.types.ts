import { z } from "zod";

export const VoteSchema = z.object({
  option_index: z.number().int().min(0).max(4),
  reason: z.string().max(1000).optional(),
});

export const GuestVoteSchema = z.object({
  option_index: z.number().int().min(0).max(4),
  session_id: z.string().min(10),
});

export type VoteInput = z.infer<typeof VoteSchema>;
export type GuestVoteInput = z.infer<typeof GuestVoteSchema>;
