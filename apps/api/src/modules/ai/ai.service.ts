import { config } from "../../config";
import {
  GeminiPollContentWithSourcesSchema,
  type GeminiPollContentWithSources,
} from "./ai.types";
import { fetchNewsArticles } from "../../lib/news";

type GeneratePollContentResult =
  | { ok: true; data: GeminiPollContentWithSources }
  | { ok: false; error: string };

export async function generatePollContent(question: string, category: string): Promise<GeneratePollContentResult> {
  if (!config.geminiApiKey) {
    return {
      ok: false,
      error: "Gemini API key is not configured.",
    };
  }

  try {
    const found = await fetchNewsArticles(`${question} ${category}`, 6);
    
    let sourceListText = "No live news sources were found. Rely on your general knowledge to provide factual, unbiased context.";
    if (found && found.length > 0) {
      sourceListText = found
        .map((f: any, i: number) => `${i + 1}. ${f.title} — ${f.source} — ${f.publishedAt || ""} — ${f.url}`)
        .join("\n");
    }

    const prompt = `You are an expert news researcher, viral social media strategist, and SEO editor for a public opinion platform (PollBooth).

MANDATE:
1. Rephrase 'improved_question' to be sentiment-driven, punchy, and compelling to drive maximum user engagement while remaining objective.
2. Write 'ai_summary': A factual 2-3 paragraph Inshorts/Firstpost style news brief giving essential background context on the topic based on the provided sources (or your general knowledge if none are provided). You MUST append this exact disclaimer at the end:
' *Disclaimer: This context was AI-generated based on recent news sources. Always verify facts independently.*'
3. Generate comprehensive SEO tags, search keywords (5-8), hashtags (3-6), and viral social media captions tailored for X, Facebook, Instagram, and WhatsApp.
4. Provide 2-4 highly engaging 'suggested_options' for the poll (MUST be an array of plain strings, not objects), 2-3 FAQ objects, and include the provided sources array (or an empty array if no sources are provided).

Sources:\n${sourceListText}\n\n
Category: ${category}
Question: ${question}

Return strictly valid JSON with no markdown block wrappers matching fields: improved_question, seo_title, meta_description, slug, keywords (array of strings), hashtags (array of strings), facebook_caption, instagram_caption, x_caption, whatsapp_share_text, ai_summary, faq, og_title, og_description, suggested_topics (array of strings), suggested_options (array of strings), sources.`;

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
          maxOutputTokens: 2000,
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

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      return {
        ok: false,
        error: "Gemini returned a non-JSON response.",
      };
    }

    if (typeof parsed === "object" && parsed !== null && (parsed as any).error) {
      return { ok: false, error: String((parsed as any).error) };
    }

    const result = GeminiPollContentWithSourcesSchema.safeParse(parsed);
    if (!result.success) {
      return {
        ok: false,
        error: `Gemini response validation failed: ${result.error.issues.map((issue) => issue.message).join(", ")}`,
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
