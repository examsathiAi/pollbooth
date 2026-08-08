"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
var path_1 = require("path");
var dotenv_1 = require("dotenv");
var zod_1 = require("zod");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
var envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "staging", "production", "test"]),
    PORT: zod_1.z.string().default("3001"),
    API_URL: zod_1.z.string().default("http://localhost:3001"),
    WEB_URL: zod_1.z.string().default("http://localhost:3000"),
    DATABASE_URL: zod_1.z.string(),
    DATABASE_POOL_SIZE: zod_1.z.string().default("20"),
    REDIS_URL: zod_1.z.string().default("redis://localhost:6379"),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default("7d"),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default("30d"),
    AWS_REGION: zod_1.z.string().default("ap-south-1"),
    AWS_ACCESS_KEY_ID: zod_1.z.string().optional(),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    S3_BUCKET_NAME: zod_1.z.string().default("pulse-assets-ap-south-1"),
    FIREBASE_PROJECT_ID: zod_1.z.string().optional(),
    FIREBASE_PRIVATE_KEY: zod_1.z.string().optional(),
    FIREBASE_CLIENT_EMAIL: zod_1.z.string().optional(),
    RAZORPAY_KEY_ID: zod_1.z.string().optional(),
    RAZORPAY_KEY_SECRET: zod_1.z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: zod_1.z.string().optional(),
    TWILIO_ACCOUNT_SID: zod_1.z.string().optional(),
    TWILIO_AUTH_TOKEN: zod_1.z.string().optional(),
    TWILIO_WHATSAPP_NUMBER: zod_1.z.string().optional(),
    ADMOB_APP_ID: zod_1.z.string().optional(),
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().default("60000"),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().default("100"),
    CORS_ALLOWED_ORIGINS: zod_1.z.string().optional(),
    ENABLE_WHATSAPP_NOTIFICATIONS: zod_1.z.string().default("false"),
    ENABLE_ADS: zod_1.z.string().default("false"),
    ENABLE_PRO_SUBSCRIPTION: zod_1.z.string().default("false"),
    ENABLE_PAID_SURVEYS: zod_1.z.string().default("false"),
    ENABLE_POLITICAL_POLLS: zod_1.z.string().default("false"),
    LOG_LEVEL: zod_1.z.enum(["debug", "info", "warn", "error"]).default("info"),
    MODERATION_SLA_HOURS: zod_1.z.string().default("24"),
    MODERATION_ALERT_THRESHOLD: zod_1.z.string().default("50"),
    SENTRY_DSN: zod_1.z.string().optional(),
    MIXPANEL_TOKEN: zod_1.z.string().optional(),
    PERSPECTIVE_API_KEY: zod_1.z.string().optional(),
    NEWSAPI_KEY: zod_1.z.string().optional(),
    GEMINI_API_KEY: zod_1.z.string().optional(),
});
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}
if (parsed.data.NODE_ENV === "production" && !parsed.data.CORS_ALLOWED_ORIGINS) {
    console.error("Production environment requires CORS_ALLOWED_ORIGINS to be set to trusted origins.");
    process.exit(1);
}
exports.config = {
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
    razorpayKeyId: parsed.data.RAZORPAY_KEY_ID,
    razorpayKeySecret: parsed.data.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: parsed.data.RAZORPAY_WEBHOOK_SECRET,
    twilioAccountSid: parsed.data.TWILIO_ACCOUNT_SID,
    twilioAuthToken: parsed.data.TWILIO_AUTH_TOKEN,
    twilioWhatsappNumber: parsed.data.TWILIO_WHATSAPP_NUMBER,
    admobAppId: parsed.data.ADMOB_APP_ID,
    rateLimitWindowMs: parseInt(parsed.data.RATE_LIMIT_WINDOW_MS, 10),
    rateLimitMaxRequests: parseInt(parsed.data.RATE_LIMIT_MAX_REQUESTS, 10),
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
        ? parsed.data.CORS_ALLOWED_ORIGINS.split(",").map(function (origin) { return origin.trim(); }).filter(Boolean)
        : parsed.data.NODE_ENV === "production"
            ? []
            : [parsed.data.WEB_URL].filter(Boolean)),
    isProduction: parsed.data.NODE_ENV === "production",
    isDevelopment: parsed.data.NODE_ENV === "development",
    isTest: parsed.data.NODE_ENV === "test",
};
