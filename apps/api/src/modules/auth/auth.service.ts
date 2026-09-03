import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../../config";
import { redis } from "../../config/redis";
import { logger } from "../../common/interceptors/logger";
import { consentService } from "../consent/consent.service";
import type { SendOtpInput, VerifyOtpInput, RefreshTokenInput } from "./auth.types";

const prisma = new PrismaClient();

if (config.nodeEnv === "production" && config.isDevelopment) {
  throw new Error("Misconfigured environment: production mode must not enable development OTP fallback.");
}

// In production, use Firebase Auth or Twilio for real OTP
// This is a mock implementation for development
export class AuthService {
  async sendOtp(input: SendOtpInput) {
    const { phone_number, mode } = input;
    const rateLimitKey = `otp_limit:${phone_number}`;
    const attempts = await redis.incr(rateLimitKey);

    if (attempts === 1) {
      await redis.expire(rateLimitKey, 3600); // 1 hour
    }

    if (attempts > 10) {
      throw new Error("Too many OTP requests. Please try again later.");
    }

    // Pre-check database to prevent WhatsApp spam and 500 errors
    // Sanitize mobile keyboard formatting to strict 10 digits
    const cleanPhone = phone_number.replace(/\D/g, '').slice(-10);
    
    const user = await prisma.user.findFirst({
      where: { phone_number: { endsWith: cleanPhone } },
    });

    if (mode === "login" && !user) {
      const error: any = new Error("User not registered");
      error.status = 404;
      throw error;
    }

    if (mode === "signup" && user) {
      const error: any = new Error("User already exists");
      error.status = 409;
      throw error;
    }

    const otp = this.generateOtpCode();
    const otpKey = `otp:${phone_number}`;

    await redis.setex(otpKey, 300, otp); // 5 minutes expiry

    await this.dispatchWhatsAppOtp(phone_number, otp);

    return { message: "OTP sent successfully", expires_in: 300 };
  }

  private async dispatchWhatsAppOtp(phone_number: string, otp: string) {
    if (config.isDevelopment) {
      logger.info(`[WhatsApp Dispatch] OTP sent to ${phone_number}: ${otp}`);
    } else {
      // Stub ready for Meta WhatsApp Cloud API Integration
      logger.info(`[WhatsApp Dispatch] OTP generated for ${phone_number}: ${otp}`);
    }
  }

  async verifyOtp(input: VerifyOtpInput, context?: { ipAddress?: string; userAgent?: string }) {
    // 1. Extract the name the user typed on the frontend (passed as 'username' in the payload)
    const { phone_number, otp, accepted_terms, accepted_privacy, age_confirmed, analytics_consent, username } = input;
    const otpKey = `otp:${phone_number}`;
    const storedOtp = await redis.get(otpKey);

    if (!storedOtp || storedOtp !== otp) {
      throw new Error("Invalid or expired OTP");
    }

    await redis.del(otpKey);

    const phone_hash = await this.getPhoneHash(phone_number);

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ phone_hash }, { phone_number }],
      },
      include: { profile: true },
    });

    const isNewUser = !user;

    if (!user) {
      if (accepted_terms !== true || accepted_privacy !== true || age_confirmed !== true) {
        throw new Error("Please accept the Terms and Privacy policy and confirm your age to create an account.");
      }
      if (!username) {
        throw new Error("Please enter your name to create an account.");
      }

      const referralCode = this.generateReferralCode();
      
      // 2. Generate a guaranteed unique background handle to satisfy the database constraint
      const safeBaseName = username.trim().replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().substring(0, 20);
      const uniqueUsername = safeBaseName ? `${safeBaseName}_${Math.random().toString(36).substring(2, 6)}` : `user_${referralCode}`;

      user = await prisma.user.create({
        data: {
          phone_hash,
          phone_number: config.isDevelopment ? phone_number : undefined, // Only store raw in dev
          referral_code: referralCode,
          name: username.trim(),       // 3. Save what the user typed to the new Display Name column
          username: uniqueUsername,    // 4. Save the generated handle to the unique background column
        },
        include: { profile: true },
      });

      // Create empty profile
      await prisma.profile.create({
        data: { user_id: user.id },
      });

      // Create vote streak record
      await prisma.voteStreak.create({
        data: { user_id: user.id },
      });

      await consentService.recordDPDPConsent(user.id, context?.ipAddress ?? null, context?.userAgent ?? null, {
        accepted_terms: true,
        accepted_privacy: true,
        age_confirmed: true,
        analytics_consent: analytics_consent === true,
      });
    }

    if (user.phone_hash !== phone_hash) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phone_hash },
      });
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = await this.generateRefreshToken(user.id);

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { last_active_at: new Date() },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        phone_number: user.phone_number,
        city: user.city,
        state: user.state,
        profile: user.profile,
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 604800, // 7 days in seconds
      },
      is_new_user: isNewUser,
    };
  }

  async refreshToken(input: RefreshTokenInput) {
    const { refresh_token } = input;

    const stored = await prisma.user.findFirst({
      where: {
        // In production, store refresh tokens in a separate table with hashed values
        // For simplicity, we validate via JWT here
      },
    });

    if (!stored) {
      throw new Error("Invalid refresh token");
    }

    // Verify refresh token
    try {
      const decoded = jwt.verify(refresh_token, config.jwtSecret) as { userId: string; type: string };
      if (decoded.type !== "refresh") {
        throw new Error("Invalid token type");
      }

      const accessToken = this.generateAccessToken(decoded.userId);
      const newRefreshToken = await this.generateRefreshToken(decoded.userId);

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: 604800,
      };
    } catch {
      throw new Error("Invalid or expired refresh token");
    }
  }

  private generateOtpCode(): string {
    if (config.nodeEnv === "development") {
      return "123456";
    }

    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async getPhoneHash(phoneNumber: string): Promise<string> {
    return bcrypt.hash(phoneNumber.trim().toLowerCase(), 12);
  }

  private generateAccessToken(userId: string): string {
    return jwt.sign(
      { userId, type: "access" },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] }
    );
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = jwt.sign(
      { userId, type: "refresh" },
      config.jwtSecret,
      { expiresIn: config.jwtRefreshExpiresIn as jwt.SignOptions["expiresIn"] }
    );

    // Store hashed refresh token in Redis for single-use rotation
    const refreshKey = `refresh:${userId}`;
    await redis.setex(refreshKey, 30 * 24 * 60 * 60, token);

    return token;
  }

  private generateReferralCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

export const authService = new AuthService();
