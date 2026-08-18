import { config } from "../config";

export interface Article {
  url: string;
  title: string;
  source: string;
  publishedAt?: string;
}

function cleanSearchQuery(rawQuery: string): string {
  const stopWords = new Set([
    "how", "long", "will", "what", "why", "when", "where", "who", "is", "are",
    "was", "were", "do", "does", "did", "the", "a", "an", "and", "or", "but",
    "by", "go", "going", "to", "for", "of", "in", "on", "at", "with", "about",
    "politics", "civic", "sports", "bollywood", "tech", "business", "education"
  ]);

  const cleaned = rawQuery
    .replace(/[^\w\s]/gi, "")
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 5)
    .join(" ");

  return cleaned.length > 0 ? cleaned : rawQuery.replace(/[^\w\s]/gi, "");
}

export async function fetchNewsArticles(query: string, limit = 5): Promise<Article[]> {
  if (!config.newsApiKey) return [];
  
  const cleanedQuery = cleanSearchQuery(query);
  const apiKey = config.newsApiKey;

  // Calculate date 15 days ago in YYYY-MM-DD format
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  const fromDate = fifteenDaysAgo.toISOString().split("T")[0];

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", cleanedQuery);
  url.searchParams.set("from", fromDate);
  url.searchParams.set("pageSize", String(limit));
  url.searchParams.set("sortBy", "publishedAt");

  try {
    const res = await fetch(url.toString(), { headers: { "X-Api-Key": apiKey } });
    if (!res.ok) return [];
    const payload: any = await res.json();
    const articles = (payload.articles || []).map((a: any) => ({
      url: a.url,
      title: a.title,
      source: a.source?.name || "",
      publishedAt: a.publishedAt,
    })) as Article[];
    
    return articles.filter((a) => a.url && a.title).slice(0, limit);
  } catch (err) {
    return [];
  }
}
