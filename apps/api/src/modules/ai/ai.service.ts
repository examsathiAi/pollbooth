import * as cheerio from "cheerio";
import axios from "axios";
import { config } from "../../config";
import {
  GeminiPollContentWithSourcesSchema,
  type GeminiPollContentWithSources,
} from "./ai.types";
import { fetchNewsArticles } from "../../lib/news";

type GeneratePollContentResult =
  | { ok: true; data: GeminiPollContentWithSources }
  | { ok: false; error: string };

interface ScrapedSource {
  url: string;
  title: string;
  publisher?: string;
  published_at?: string;
  snippet?: string;
  deepText?: string;
}

/**
 * Enterprise RAG Engine: Crawls up to 10 live news & web sources concurrently,
 * extracts verified paragraphs, and grounds AI with current temporal awareness.
 */
async function fetchDeepNewsContext(query: string): Promise<{ contextText: string; sources: ScrapedSource[] }> {
  try {
    const currentYear = new Date().getFullYear();
    const cleanQuery = query.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
    
    // Target high-relevance current news via Google News RSS with year & freshness biasing
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery + " " + currentYear)}&hl=en-IN&gl=IN&ceid=IN:en`;

    let rssRes;
    try {
      rssRes = await axios.get(rssUrl, {
        timeout: 4000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
      });
    } catch {
      // Fallback query if specific year RSS yields low results
      rssRes = await axios.get(`https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=en-IN&gl=IN&ceid=IN:en`, {
        timeout: 4000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
      });
    }

    const $rss = cheerio.load(rssRes.data, { xmlMode: true });
    const rawItems: ScrapedSource[] = [];

    $rss("item").slice(0, 10).each((_, el) => {
      const title = $rss(el).find("title").text()?.trim() || "";
      const link = $rss(el).find("link").text()?.trim() || "";
      const pubDate = $rss(el).find("pubDate").text()?.trim() || "";
      const sourceName = $rss(el).find("source").text()?.trim() || "";
      const description = $rss(el).find("description").text()?.replace(/<[^>]*>?/gm, "").trim() || "";

      if (title && link) {
        rawItems.push({
          title,
          url: link,
          publisher: sourceName || "News Source",
          published_at: pubDate || undefined,
          snippet: description
        });
      }
    });

    if (rawItems.length === 0) {
      return { contextText: "", sources: [] };
    }

    // Concurrently deep-scrape top 5 articles to extract full paragraph context
    const scrapePromises = rawItems.slice(0, 5).map(async (item) => {
      try {
        const articleRes = await axios.get(item.url, {
          timeout: 3500,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
          },
          maxRedirects: 5
        });
        const $art = cheerio.load(articleRes.data);$art("script, style, nav, footer, header, aside, form, noscript").remove();
        
        const paragraphs: string[] = [];
        $art("p").slice(0, 6).each((_, p) => {
          const text = $art(p).text().trim();
          if (text.length > 60 && !text.includes("cookie") && !text.includes("subscribe")) {
            paragraphs.push(text);
          }
        });

        if (paragraphs.length > 0) {
          item.deepText = paragraphs.join(" ");
        }
      } catch {
        // Snippet remains fallback if direct link scraping is blocked
      }
      return item;
    });

    await Promise.allSettled(scrapePromises);

    const contextText = rawItems.map((item, idx) => {
      let chunk = `[SOURCE ${idx + 1}] TITLE: ${item.title}\nOUTLET: ${item.publisher || "General"}\nDATE: ${item.published_at || "Recent"}\nSUMMARY: ${item.snippet}`;
      if (item.deepText) {
        chunk += `\nDEEP EXCERPT: ${item.deepText.slice(0, 600)}`;
      }
      return chunk;
    }).join("\n\n---\n\n");

    return {
      contextText: contextText.slice(0, 6000),
      sources: rawItems.map(i => ({
        url: i.url,
        title: i.title,
        publisher: i.publisher,
        published_at: i.published_at
      }))
    };
  } catch (error) {
    return { contextText: "", sources: [] };
  }
}

export async function generatePollContent(question: string, category: string): Promise<GeneratePollContentResult> {
  if (!config.geminiApiKey) {
    return {
      ok: false,
      error: "Gemini API key is not configured.",
    };
  }

  try {
    const now = new Date();
    const currentDateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const currentYear = now.getFullYear();

    const [existingNews, deepRagData] = await Promise.all([
      fetchNewsArticles(`${question} ${category} ${currentYear}`, 6).catch(() => []),
      fetchDeepNewsContext(question)
    ]);

    let sourceListText = "No supplementary news articles found.";
    if (existingNews && existingNews.length > 0) {
      sourceListText = existingNews
        .map((f: any, i: number) => `${i + 1}. ${f.title} — ${f.source} — ${f.publishedAt || ""} — ${f.url}`)
        .join("\n");
    }

    const prompt = `You are an elite Indian investigative data journalist and SEO strategist for PollBooth.

TEMPORAL ANCHOR (MANDATORY):
- CURRENT DATE: ${currentDateStr}
- CURRENT YEAR: ${currentYear}
- CRITICAL TEMPORAL DIRECTIVE: You MUST generate all content from the perspective of ${currentDateStr}. When generating SEO titles, meta descriptions, slugs, hashtags, and social captions, ALWAYS use ${currentYear} or present-tense framing. NEVER use past years (such as 2024 or 2025) as the current year.

VERIFIED LIVE MULTI-SOURCE NEWS & CRAWLED INTELLIGENCE (10 SOURCES):
${deepRagData.contextText || "No live RSS feed retrieved."}

ADDITIONAL SOURCE SNIPPETS:
${sourceListText}

TASK:
Analyze the poll question: "${question}" (Category: ${category}).

1. Write 'ai_summary': A massive, deep-dive investigative journalism article (6-8 dense paragraphs, minimum 800 words). It must read like a premium front-page editorial. Cover extensive background history, micro and macro implications, key stakeholders, public sentiment, and detailed analysis based strictly on the verified ${currentYear} material. MUST end with:\n\n*Disclaimer: This context was AI-generated based on recent news sources. Always verify facts independently.*
2. Write 'faq': 2-4 key Q&As addressing the most searched questions on this topic by the Indian public for ${currentYear}.
3. Generate 'suggested_options': An array of 2-4 realistic, mutually exclusive poll answers (e.g. candidate/actor names or direct answers). DO NOT include UI buttons or action items.
4. Extract 'hashtags': 3-5 authentic, high-traffic trending hashtags hyper-localized for Indian social media in ${currentYear}. YOU MUST ALWAYS INCLUDE "#pollbooth".
5. Generate 'keywords': 6-10 high-intent SEO search phrases targeting ${currentYear}.
6. Generate social captions:
   - 'x_caption': Punchy tweet hook ending with relevant hashtags and #pollbooth.
   - 'whatsapp_share_text': Highly forwardable conversational invite with emojis and #pollbooth.
   - 'facebook_caption': Contextual summary hook with #pollbooth.
   - 'instagram_caption': High-engagement caption with news summary, key question, and all hashtags including #pollbooth.

Return strictly valid JSON matching:
{
  "improved_question": string,
  "seo_title": string,
  "meta_description": string,
  "slug": string,
  "keywords": string[],
  "hashtags": string[],
  "facebook_caption": string,
  "instagram_caption": string,
  "x_caption": string,
  "whatsapp_share_text": string,
  "ai_summary": string,
  "faq": [{"question": string, "answer": string}],
  "og_title": string,
  "og_description": string,
  "suggested_topics": string[],
  "suggested_options": string[],
  "sources": [{"url": string, "title": string, "publisher": string, "published_at": string}]
}`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 6000,
          responseMimeType: "application/json",
        }
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      return {
        ok: false,
        error: `Gemini request failed: ${payload}`,
      };
    }

    const payload = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      return {
        ok: false,
        error: "Gemini returned an empty response.",
      };
    }

    const cleanJson = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
      // Auto-unwrap if root array wrapping occurs
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed = parsed[0];
      }
      
      // SELF-HEALING: If Gemini hallucinates the FAQ as an array of arrays instead of objects
      if (parsed && Array.isArray(parsed.faq)) {
        parsed.faq = parsed.faq.map((item: any) => {
          if (Array.isArray(item) && item.length >= 2) {
            return { question: String(item[0]), answer: String(item[1]) };
          }
          return item;
        });
      }
    } catch {
      return {
        ok: false,
        error: "Gemini returned a non-JSON response.",
      };
    }

    if (typeof parsed === "object" && parsed !== null && parsed.error) {
      return { ok: false, error: String(parsed.error) };
    }

    // Merge high-quality crawled sources if model produced an empty source array
    if ((!parsed.sources || parsed.sources.length === 0) && deepRagData.sources.length > 0) {
      parsed.sources = deepRagData.sources.slice(0, 5);
    }

    const result = GeminiPollContentWithSourcesSchema.safeParse(parsed);
    if (!result.success) {
      const formattedErrors = result.error.issues
        .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "root"}: ${issue.message}`)
        .join(", ");
      return {
        ok: false,
        error: `Gemini response validation failed: ${formattedErrors}`,
      };
    }

    return {
      ok: true,
      data: result.data,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gemini request failed.",
    };
  }
}

export const generateQuestionImprovement = generatePollContent;
