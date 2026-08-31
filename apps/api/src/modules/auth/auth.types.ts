import { z } from "zod";

export const SendOtpSchema = z.object({
  phone_number: z
    .string()
    .regex(/^(\+91)?[6-9]\d{9}$/, "Invalid 10-digit Indian mobile number"),
  mode: z.enum(["login", "signup"]),
});

export const VerifyOtpSchema = z.object({
  phone_number: z
    .string()
    .regex(/^(\+91)?[6-9]\d{9}$/, "Invalid 10-digit Indian mobile number"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  username: z.string().min(2, "Name must be at least 2 characters").max(50).optional(),
  accepted_terms: z.boolean().optional(),
  accepted_privacy: z.boolean().optional(),
  age_confirmed: z.boolean().optional(),
  analytics_consent: z.boolean().optional(),
});

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1, "Refresh token is required"),
});

export type SendOtpInput = z.infer<typeof SendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
