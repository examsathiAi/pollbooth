const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type TopicEntry = {
  slug: string;
};

type PollEntry = {
  id: string;
  question: string;
  category?: string;
  slug?: string | null;
  hashtags?: string[];
  created_at?: string | null;
};

// Mirror the exact frontend slug logic to guarantee perfect canonical URLs
function getPollSlug(poll: PollEntry): string {
  if (poll.slug) return poll.slug;
  if (poll.hashtags && poll.hashtags.length > 0) {
    return poll.hashtags.map(h => h.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()).filter(Boolean).join("-");
  }
  const q = (poll.question || "").replace(/\b(will|is|are|the|to|a|an|in|on|of|for|with|and|or|do|does|what|how|why|can)\b/gi, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  return `${(poll.category || "poll").toLowerCase().replace(/_/g, "-")}-${q}`.slice(0, 75).replace(/-$/, "");
}

export default async function sitemap() {
  const staticEntries = [
    { url: SITE_URL, lastModified: new Date() },
    { url: `${SITE_URL}/feed`, lastModified: new Date() },
    { url: `${SITE_URL}/discover`, lastModified: new Date() },
    { url: `${SITE_URL}/topics`, lastModified: new Date() },
    { url: `${SITE_URL}/privacy`, lastModified: new Date() },
    { url: `${SITE_URL}/terms`, lastModified: new Date() },
  ];

  try {
    // 1. Fetch Topics
    const topicRes = await fetch(`${API_URL}/api/v1/topics?active=true&limit=100`, { cache: "no-store" });
    if (topicRes.ok) {
      const topics = (await topicRes.json()) as TopicEntry[];
      if (Array.isArray(topics)) {
        staticEntries.push(
          ...topics.map((topic) => ({
            url: `${SITE_URL}/topics/${topic.slug}`,
            lastModified: new Date(),
          }))
        );
      }
    }

    // 2. Fetch All Active Polls
    const polls: PollEntry[] = [];
    let page = 1;
    const limit = 100;
    let totalPages = 1;

    while (page <= totalPages) {
      const pollRes = await fetch(`${API_URL}/api/v1/polls/feed?page=${page}&limit=${limit}`, { cache: "no-store" });
      if (!pollRes.ok) break;

      const data = (await pollRes.json()) as {
        polls: PollEntry[];
        pagination?: { page: number; limit: number; total: number; total_pages: number };
      };

      if (!Array.isArray(data.polls) || data.polls.length === 0) break;

      polls.push(...data.polls);
      if (data.pagination?.total_pages) {
        totalPages = data.pagination.total_pages;
      } else {
        totalPages = page;
      }
      page += 1;
    }

    // Append correct SEO slugged URLs
    staticEntries.push(
      ...polls.map((poll) => ({
        url: `${SITE_URL}/poll/${getPollSlug(poll)}--${poll.id}`,
        lastModified: poll.created_at ? new Date(poll.created_at) : new Date(),
      }))
    );
  } catch (error) {
    console.error("Failed to build dynamic sitemap entries", error);
  }

  return staticEntries;
}
