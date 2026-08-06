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
    // perform a server-side news search first to gather verifiable sources
    const searchQuery = `${question} ${category}`;
    const found = await fetchNewsArticles(searchQuery, 6);
    if (!found || found.length === 0) {
      return { ok: false, error: "NO_VERIFIABLE_SOURCES_FOUND" };
    }

    const sourceListText = found.map((f: any, i: number) => `${i + 1}. ${f.title} — ${f.source} — ${f.publishedAt || ""} — ${f.url}`).join("\n");

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.geminiApiKey,
      },
      body: JSON.stringify({
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.0,
          candidateCount: 1,
          maxOutputTokens: 1200,
        },
        contents: [{
          parts: [{
            text: `You are a web researcher and factual content generator. STRICT RULES (tuned):

1) No hallucinations: DO NOT invent facts, numbers, dates, or named entities. Every factual claim must be directly supported by one or more of the server-provided sources below.
2) Source use: Use ONLY the sources explicitly listed below. Do not call any other sources or rely on internal world knowledge. If a required factual field cannot be supported by these sources, omit that field or return {"error":"NO_VERIFIABLE_SOURCES_FOUND"}.
3) Recency preference: Prefer sources published within the last 30 days. If you must use older sources, mark them by adding an attribute (e.g., "stale": true) in the sources array.
4) Field-level provenance: For any field that contains factual claims (numbers, dates, named entities, percentages, specific citations), include a sibling field with the suffix '_source_indices' listing the 1-based indices of the source(s) in the provided 'sources' array that directly support that field. Example: "ai_summary_source_indices": [1], "keywords_source_indices": [2,3].
5) Output shape: Return exactly one JSON object and nothing else. The object MUST match the schema and include: improved_question, seo_title, meta_description, slug, keywords (5-8), hashtags (3-6), facebook_caption, instagram_caption, x_caption, whatsapp_share_text, ai_summary (2-3 sentences), faq (2-3 objects with question and answer), og_title, og_description, suggested_topics (2-4), and sources (array of objects with url, title, publisher (optional), published_at (optional)). No extra keys.
6) Sources array: The 'sources' array must contain canonical objects for each source you used, matching the required shape. Do not invent URLs or publishers. At least one source must be reachable.
7) Length & formatting constraints: Keep 'seo_title' <=60 chars, 'meta_description' <=160 chars, 'facebook_caption' <=400 chars, 'instagram_caption' <=300 chars, 'x_caption' <=280 chars, 'whatsapp_share_text' <=200 chars.

Sources (server-provided, use these only):\n${sourceListText}\n\n
Category: ${category}
Question: ${question}

Return strictly valid JSON that conforms to the schema.`,
          }],
        }],
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      return {
        ok: false,
        error: `Gemini request failed: ${payload}`,
      };
    }

    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      return {
        ok: false,
        error: "Gemini returned an empty response.",
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: "Gemini returned a non-JSON response.",
      };
    }
    // allow the model to return a short error object
    if (typeof parsed === "object" && parsed !== null && (parsed as any).error) {
      return { ok: false, error: String((parsed as any).error) };
    }

    const result = GeminiPollContentWithSourcesSchema.safeParse(parsed);
    if (!result.success) {
      return {
        ok: false,
        error: `Gemini response did not match the expected shape: ${result.error.issues.map((issue) => issue.message).join(", ")}`,
      };
    }

    // verify that each source is reachable (simple HEAD request); fail early if any source is unreachable
    const sources = result.data.sources || [];
    for (const s of sources) {
      try {
        const res = await fetch(s.url, { method: "HEAD" });
        if (!res.ok) {
          return { ok: false, error: `Source unreachable: ${s.url}` };
        }
      } catch (err) {
        return { ok: false, error: `Source fetch failed: ${s.url}` };
      }
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
