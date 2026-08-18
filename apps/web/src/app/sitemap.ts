const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type TopicEntry = {
  slug: string;
};

type PollEntry = {
  id: string;
  created_at?: string | null;
};

export default async function sitemap() {
  const staticEntries = [
    {
      url: SITE_URL,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/feed`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/discover`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/topics`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
    },
  ];

  try {
    const topicRes = await fetch(`${API_URL}/api/v1/topics?active=true&limit=100`, {
      cache: "no-store",
    });

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

    const polls: PollEntry[] = [];
    let page = 1;
    const limit = 100;
    let totalPages = 1;

    while (page <= totalPages) {
      const pollRes = await fetch(`${API_URL}/api/v1/polls/feed?page=${page}&limit=${limit}`, {
        cache: "no-store",
      });

      if (!pollRes.ok) {
        break;
      }

      const data = (await pollRes.json()) as {
        polls: PollEntry[];
        pagination?: { page: number; limit: number; total: number; total_pages: number };
      };

      if (!Array.isArray(data.polls) || data.polls.length === 0) {
        break;
      }

      polls.push(...data.polls);
      if (data.pagination?.total_pages) {
        totalPages = data.pagination.total_pages;
      } else {
        totalPages = page;
      }
      page += 1;
    }

    staticEntries.push(
      ...polls.map((poll) => ({
        url: `${SITE_URL}/poll/${poll.id}`,
        lastModified: poll.created_at ? new Date(poll.created_at) : new Date(),
      }))
    );
  } catch (error) {
    console.error("Failed to build dynamic sitemap entries", error);
  }

  return staticEntries;
}
