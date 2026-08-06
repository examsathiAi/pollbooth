import { config } from "../config";

export interface Article {
  url: string;
  title: string;
  source: string;
  publishedAt?: string;
}

export async function fetchNewsArticles(query: string, limit = 5): Promise<Article[]> {
  if (!config.newsApiKey) return [];
  const apiKey = config.newsApiKey;
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", query);
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
