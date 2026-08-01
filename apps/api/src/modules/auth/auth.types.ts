import { z } from "zod";

export const SendOtpSchema = z.object({
  phone_number: z.string().regex(/^\+91[6-9]\d{9}$/, "Invalid Indian phone number"),
});

export const VerifyOtpSchema = z.object({
  phone_number: z.string(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().uuid(),
});

export type SendOtpInput = z.infer<typeof SendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
