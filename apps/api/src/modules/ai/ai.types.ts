import { z } from "zod";

const faqItemSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

export const GeminiPollContentSchema = z.object({
  improved_question: z.string().trim().min(1),
  seo_title: z.string().trim().min(1).transform((v) => v.slice(0, 60)),
  meta_description: z.string().trim().min(1).transform((v) => v.slice(0, 160)),
  slug: z.string().trim().min(1).transform((v) => v.slice(0, 100)),
  keywords: z.array(z.string().trim().min(1)).min(1),
  hashtags: z.array(z.string().trim().min(1).transform((value) => value.replace(/^#+/, "").trim())).min(1),
  facebook_caption: z.string().trim().min(1),
  instagram_caption: z.string().trim().min(1),
  x_caption: z.string().trim().min(1),
  whatsapp_share_text: z.string().trim().min(1),
  ai_summary: z.string().trim().min(1),
  faq: z.array(faqItemSchema).min(1),
  og_title: z.string().trim().min(1).transform((v) => v.slice(0, 60)),
  og_description: z.string().trim().min(1),
  suggested_topics: z.array(z.string().trim().min(1)).min(1),
  suggested_options: z.array(z.string().trim().min(1)).optional(),
}).passthrough();

const sourceSchema = z.object({
  url: z.string(),
  title: z.string().trim().min(1),
  publisher: z.string().trim().optional(),
  published_at: z.string().optional(),
});

export const GeminiPollContentWithSourcesSchema = GeminiPollContentSchema.extend({
  sources: z.array(sourceSchema).optional().default([]),
}).passthrough();

export type GeminiPollContentWithSources = z.infer<typeof GeminiPollContentWithSourcesSchema>;
export type GeminiPollContent = z.infer<typeof GeminiPollContentSchema>;
