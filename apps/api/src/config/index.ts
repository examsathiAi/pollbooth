import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]),
  PORT: z.string().default("3001"),
  API_URL: z.string().default("http://localhost:3001"),
  WEB_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string(),
  DATABASE_POOL_SIZE: z.string().default("20"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  AWS_REGION: z.string().default("ap-south-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().default("pollbooth-assets-ap-south-1"),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_DATABASE_URL: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  ADMOB_APP_ID: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().default("60000"),
  RATE_LIMIT_MAX_REQUESTS: z.string().default("100"),
  ENCRYPTION_KEY: z.string().min(32),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  ENABLE_WHATSAPP_NOTIFICATIONS: z.string().default("false"),
  ENABLE_ADS: z.string().default("false"),
  ENABLE_PRO_SUBSCRIPTION: z.string().default("false"),
  ENABLE_PAID_SURVEYS: z.string().default("false"),
  ENABLE_POLITICAL_POLLS: z.string().default("false"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  MODERATION_SLA_HOURS: z.string().default("24"),
  MODERATION_ALERT_THRESHOLD: z.string().default("50"),
  SENTRY_DSN: z.string().optional(),
  MIXPANEL_TOKEN: z.string().optional(),
  PERSPECTIVE_API_KEY: z.string().optional(),
  NEWSAPI_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const hasPlaceholderSecret = (value?: string) => {
  if (!value) return true;
  return /dev-|placeholder|example|demo|changeme|test-secret/i.test(value);
};

if (parsed.data.NODE_ENV === "production") {
  if (!parsed.data.CORS_ALLOWED_ORIGINS) {
    console.error("Production environment requires CORS_ALLOWED_ORIGINS to be set to trusted origins.");
    process.exit(1);
  }

  if (parsed.data.CORS_ALLOWED_ORIGINS.includes("*")) {
    console.error("Production environment must not use a wildcard CORS origin.");
    process.exit(1);
  }

  if (hasPlaceholderSecret(parsed.data.JWT_SECRET) || hasPlaceholderSecret(parsed.data.ENCRYPTION_KEY)) {
    console.error("Production environment requires non-placeholder JWT_SECRET and ENCRYPTION_KEY values.");
    process.exit(1);
  }
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parseInt(parsed.data.PORT, 10),
  apiUrl: parsed.data.API_URL,
  webUrl: parsed.data.WEB_URL,
  databaseUrl: parsed.data.DATABASE_URL,
  databasePoolSize: parseInt(parsed.data.DATABASE_POOL_SIZE, 10),
  redisUrl: parsed.data.REDIS_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  jwtRefreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,
  awsRegion: parsed.data.AWS_REGION,
  awsAccessKeyId: parsed.data.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: parsed.data.AWS_SECRET_ACCESS_KEY,
  s3BucketName: parsed.data.S3_BUCKET_NAME,
  firebaseProjectId: parsed.data.FIREBASE_PROJECT_ID,
  firebasePrivateKey: parsed.data.FIREBASE_PRIVATE_KEY,
  firebaseClientEmail: parsed.data.FIREBASE_CLIENT_EMAIL,
  firebaseDatabaseUrl: parsed.data.FIREBASE_DATABASE_URL,
  razorpayKeyId: parsed.data.RAZORPAY_KEY_ID,
  razorpayKeySecret: parsed.data.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: parsed.data.RAZORPAY_WEBHOOK_SECRET,
  twilioAccountSid: parsed.data.TWILIO_ACCOUNT_SID,
  twilioAuthToken: parsed.data.TWILIO_AUTH_TOKEN,
  twilioWhatsappNumber: parsed.data.TWILIO_WHATSAPP_NUMBER,
  admobAppId: parsed.data.ADMOB_APP_ID,
  rateLimitWindowMs: parseInt(parsed.data.RATE_LIMIT_WINDOW_MS, 10),
  rateLimitMaxRequests: parseInt(parsed.data.RATE_LIMIT_MAX_REQUESTS, 10),
  encryptionKey: parsed.data.ENCRYPTION_KEY,
  enableWhatsappNotifications: parsed.data.ENABLE_WHATSAPP_NOTIFICATIONS === "true",
  enableAds: parsed.data.ENABLE_ADS === "true",
  enableProSubscription: parsed.data.ENABLE_PRO_SUBSCRIPTION === "true",
  enablePaidSurveys: parsed.data.ENABLE_PAID_SURVEYS === "true",
  enablePoliticalPolls: parsed.data.ENABLE_POLITICAL_POLLS === "true",
  logLevel: parsed.data.LOG_LEVEL,
  moderationSlaHours: parseInt(parsed.data.MODERATION_SLA_HOURS, 10),
  moderationAlertThreshold: parseInt(parsed.data.MODERATION_ALERT_THRESHOLD, 10),
  sentryDsn: parsed.data.SENTRY_DSN,
  mixpanelToken: parsed.data.MIXPANEL_TOKEN,
  perspectiveApiKey: parsed.data.PERSPECTIVE_API_KEY,
  newsApiKey: parsed.data.NEWSAPI_KEY,
  geminiApiKey: parsed.data.GEMINI_API_KEY,
  corsOrigins: (parsed.data.CORS_ALLOWED_ORIGINS
    ? parsed.data.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : parsed.data.NODE_ENV === "production"
      ? []
      : [parsed.data.WEB_URL].filter(Boolean)),
  isProduction: parsed.data.NODE_ENV === "production",
  isDevelopment: parsed.data.NODE_ENV === "development",
  isTest: parsed.data.NODE_ENV === "test",
};
