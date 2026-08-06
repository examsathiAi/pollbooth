import { z } from "zod";

const faqItemSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

export const GeminiPollContentSchema = z.object({
  improved_question: z.string().trim().min(1),
  seo_title: z.string().trim().min(1).max(60),
  meta_description: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL-safe"),
  keywords: z.array(z.string().trim().min(1)).min(5).max(8),
  hashtags: z.array(z.string().trim().min(1).transform((value) => value.replace(/^#+/, "").trim())).min(3).max(6),
  facebook_caption: z.string().trim().min(1).max(400),
  instagram_caption: z.string().trim().min(1).max(300),
  x_caption: z.string().trim().min(1).max(280),
  whatsapp_share_text: z.string().trim().min(1).max(200),
  ai_summary: z.string().trim().min(1),
  faq: z.array(faqItemSchema).min(2).max(3),
  og_title: z.string().trim().min(1).max(60),
  og_description: z.string().trim().min(1).max(200),
  suggested_topics: z.array(z.string().trim().min(1)).min(2).max(4),
}).strict();

const sourceSchema = z.object({
  url: z.string().url(),
  title: z.string().trim().min(1),
  publisher: z.string().trim().optional(),
  published_at: z.string().optional(),
});

export const GeminiPollContentWithSourcesSchema = GeminiPollContentSchema.extend({
  sources: z.array(sourceSchema).min(1),
}).strict();

export type GeminiPollContentWithSources = z.infer<typeof GeminiPollContentWithSourcesSchema>;

export type GeminiPollContent = z.infer<typeof GeminiPollContentSchema>;
