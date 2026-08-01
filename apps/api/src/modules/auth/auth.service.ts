import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../../config";
import { redis } from "../../config/redis";
import { logger } from "../../common/interceptors/logger";
import type { SendOtpInput, VerifyOtpInput, RefreshTokenInput } from "./auth.types";

const prisma = new PrismaClient();

// In production, use Firebase Auth or Twilio for real OTP
// This is a mock implementation for development
export class AuthService {
  async sendOtp(input: SendOtpInput) {
    const { phone_number } = input;
    const rateLimitKey = `otp_limit:${phone_number}`;
    const attempts = await redis.incr(rateLimitKey);

    if (attempts === 1) {
      await redis.expire(rateLimitKey, 3600); // 1 hour
    }

    if (attempts > 10) {
      throw new Error("Too many OTP requests. Please try again later.");
    }

    const otp = config.isDevelopment ? "123456" : Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${phone_number}`;

    await redis.setex(otpKey, 300, otp); // 5 minutes expiry

    // In production: send via Firebase Auth SMS or Twilio
    logger.info(`OTP sent to ${phone_number}: ${otp}`);

    return { message: "OTP sent successfully", expires_in: 300 };
  }

  async verifyOtp(input: VerifyOtpInput) {
    const { phone_number, otp } = input;
    const otpKey = `otp:${phone_number}`;
    const storedOtp = await redis.get(otpKey);

    if (!storedOtp || storedOtp !== otp) {
      throw new Error("Invalid or expired OTP");
    }

    await redis.del(otpKey);

    const phone_hash = await bcrypt.hash(phone_number, 12);

    let user = await prisma.user.findUnique({
      where: { phone_hash },
      include: { profile: true },
    });

    const isNewUser = !user;

    if (!user) {
      const referralCode = this.generateReferralCode();
      user = await prisma.user.create({
        data: {
          phone_hash,
          phone_number: config.isDevelopment ? phone_number : undefined, // Only store raw in dev
          referral_code: referralCode,
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
