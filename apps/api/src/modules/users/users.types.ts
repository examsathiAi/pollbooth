import { z } from "zod";

export const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  age_bracket: z.enum(["GEN_Z", "MILLENNIAL", "GEN_X", "BOOMER"]).optional(),
  gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY"]).optional(),
  education: z.string().max(50).optional(),
  income_bracket: z.string().max(50).optional(),
  employment: z.string().max(50).optional(),
  vehicle: z.string().max(50).optional(),
  diet: z.enum(["VEG", "NON_VEG", "VEGAN"]).optional(),
  shopping_pref: z.enum(["ONLINE", "OFFLINE", "BOTH"]).optional(),
}).strict();

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
