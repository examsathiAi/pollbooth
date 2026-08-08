"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictPollSchema = exports.PollQuerySchema = exports.PollIdSchema = exports.CreatePollSchema = void 0;
var zod_1 = require("zod");
var faqEntrySchema = zod_1.z.object({
    question: zod_1.z.string().trim().min(1),
    answer: zod_1.z.string().trim().min(1),
});
exports.CreatePollSchema = zod_1.z.object({
    question: zod_1.z.string().min(10).max(500),
    options: zod_1.z.array(zod_1.z.string().min(1).max(100)).min(2).max(5),
    category: zod_1.z.enum([
        "POLITICS", "CIVIC", "BOLLYWOOD", "SPORTS", "CURRENT_EVENTS",
        "LOCAL", "SOCIAL", "ECONOMY", "EDUCATION", "HEALTH", "TECH",
        "FOOD", "TRAVEL", "FASHION", "AUTO", "REAL_ESTATE", "STARTUPS",
        "WORK_CULTURE", "ENVIRONMENT", "OTHER",
    ]),
    sub_category: zod_1.z.string().max(50).optional(),
    start_date: zod_1.z.string().datetime().optional(),
    end_date: zod_1.z.string().datetime().optional(),
    target_filters: zod_1.z.object({
        age_brackets: zod_1.z.array(zod_1.z.string()).optional(),
        genders: zod_1.z.array(zod_1.z.string()).optional(),
        states: zod_1.z.array(zod_1.z.string()).optional(),
        cities: zod_1.z.array(zod_1.z.string()).optional(),
        city_tiers: zod_1.z.array(zod_1.z.string()).optional(),
        income_brackets: zod_1.z.array(zod_1.z.string()).optional(),
        education: zod_1.z.array(zod_1.z.string()).optional(),
        employment: zod_1.z.array(zod_1.z.string()).optional(),
        vehicle_ownership: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
    is_commercial: zod_1.z.boolean().default(false),
    status: zod_1.z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE"]).optional(),
    is_active: zod_1.z.boolean().optional(),
    sponsor_id: zod_1.z.string().uuid().optional(),
    seo_title: zod_1.z.string().max(60).optional(),
    meta_description: zod_1.z.string().max(160).optional(),
    slug: zod_1.z.string().max(100).optional(),
    keywords: zod_1.z.array(zod_1.z.string()).optional(),
    hashtags: zod_1.z.array(zod_1.z.string()).optional(),
    facebook_caption: zod_1.z.string().max(400).optional(),
    instagram_caption: zod_1.z.string().max(300).optional(),
    x_caption: zod_1.z.string().max(280).optional(),
    whatsapp_share_text: zod_1.z.string().max(200).optional(),
    ai_summary: zod_1.z.string().optional(),
    faq: zod_1.z.array(faqEntrySchema).optional(),
    og_title: zod_1.z.string().max(60).optional(),
    og_description: zod_1.z.string().max(200).optional(),
    topic_names: zod_1.z.array(zod_1.z.string().trim().min(1)).optional(),
}).strict();
exports.PollIdSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
exports.PollQuerySchema = zod_1.z.object({
    category: zod_1.z.string().optional(),
    status: zod_1.z.enum(["ACTIVE", "DRAFT", "PENDING_REVIEW", "ARCHIVED", "ALL"]).default("ACTIVE"),
    page: zod_1.z.string().transform(Number).default("1"),
    limit: zod_1.z.string().transform(Number).default("20"),
    search: zod_1.z.string().optional(),
});
exports.PredictPollSchema = zod_1.z.object({
    predicted_percentage: zod_1.z.number().int().min(0).max(100),
});
