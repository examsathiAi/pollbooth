const fs = require('fs');
const file = 'apps/api/src/modules/ai/ai.service.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add cheerio & axios imports if not present
if (!code.includes('import * as cheerio')) {
  code = `import * as cheerio from "cheerio";\nimport axios from "axios";\n` + code;
}

// 2. Inject the live web scraping function before generatePollMetadata
const scraperFunction = `
/**
 * Scrapes live news articles related to the topic without requiring paid API keys
 */
async function fetchDeepNewsContext(query: string): Promise<string> {
  try {
    const cleanQuery = query.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
    const rssUrl = \`https://news.google.com/rss/search?q=\${encodeURIComponent(cleanQuery)}&hl=en-IN&gl=IN&ceid=IN:en\`;

    const rssRes = await axios.get(rssUrl, {
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    const $rss = cheerio.load(rssRes.data, { xmlMode: true });
    const items: Array<{ title: string; link: string; snippet: string }> = [];

    $rss("item").slice(0, 3).each((_, el) => {
      const title = $rss(el).find("title").text();
      const link = $rss(el).find("link").text();
      const description = $rss(el).find("description").text().replace(/<[^>]*>?/gm, "");
      if (title) items.push({ title, link, snippet: description });
    });

    if (items.length === 0) return "";

    let combinedContext = items.map(item => \`HEADLINE: \${item.title}\\nSUMMARY: \${item.snippet}\`).join("\\n\\n");

    // Fetch and extract deep text from the primary article
    if (items[0]?.link) {
      try {
        const articleRes = await axios.get(items[0].link, {
          timeout: 4000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          maxRedirects: 5
        });
        const $art = cheerio.load(articleRes.data);
        $art("script, style, nav, footer, header, aside").remove();
        
        let paragraphs: string[] = [];
        $art("p").slice(0, 8).each((_, p) => {
          const text = $art(p).text().trim();
          if (text.length > 50) paragraphs.push(text);
        });

        if (paragraphs.length > 0) {
          combinedContext += "\\n\\nDEEP ARTICLE CONTEXT:\\n" + paragraphs.join("\\n\\n");
        }
      } catch (err) {
        // Fallback to RSS snippet if article scraping encounters paywall/timeout
      }
    }

    return combinedContext.slice(0, 4000);
  } catch (error) {
    return "";
  }
}
`;

if (!code.includes('fetchDeepNewsContext')) {
  code = code.replace(/(export async function generatePollMetadata|export class AIService)/, scraperFunction + '\n$1');
}

// 3. Inject deep context call and mandatory #pollbooth prompt instructions
const promptTargetRegex = /const prompt = `([\s\S]*?)`;/;
const promptMatch = code.match(promptTargetRegex);

if (promptMatch) {
  const updatedPrompt = `const liveNewsContext = await fetchDeepNewsContext(question || input.question || "");
    const prompt = \`You are an elite investigative data journalist and SEO strategist for PollBooth.

VERIFIED LIVE NEWS SOURCE MATERIAL:
\${liveNewsContext || "No live RSS feed retrieved. Use strictly factual journalistic context."}

TASK:
Analyze the question: "\${question || input.question}".
1. Write 'ai_summary': A comprehensive 2-3 paragraph news brief explaining the core background, major stakeholders, factual developments, and policy or public implications based on the verified live material. MUST end with:
\\n\\n*Disclaimer: This context was AI-generated based on recent news sources. Always verify facts independently.*
2. Write 'faq': An array of 2-4 key Q&As (question, answer) addressing the most searched questions on this topic.
3. Extract 'hashtags': An array of 3-5 authentic, high-traffic trending hashtags extracted from the news context. YOU MUST ALWAYS INCLUDE "#pollbooth" AS ONE OF THE HASHTAGS.
4. Generate 'keywords': 6-10 high-intent SEO search phrases.
5. Generate social captions:
   - 'x_caption': Punchy tweet hook ending with relevant hashtags and #pollbooth.
   - 'whatsapp_share_text': Conversational invite with emojis and #pollbooth.
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
  "sources": string[]
}\`;`;

  code = code.replace(promptTargetRegex, updatedPrompt);
}

fs.writeFileSync(file, code);
console.log('Deep RAG News Scraper & #pollbooth engine successfully injected into ai.service.ts');
