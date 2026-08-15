import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type TopicSummary = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_category?: string | null;
};

async function fetchTopics() {
  const res = await fetch(`${API_URL}/api/v1/topics?active=true&limit=100`, { cache: "no-store" });
  if (!res.ok) {
    return [] as TopicSummary[];
  }

  return (await res.json()) as TopicSummary[];
}

export default async function TopicsPage() {
  const topics = await fetchTopics();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Topics</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Explore public topic communities</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Browse PollBooth topics and jump straight to polls, trending discussions, and the latest opinion snapshots.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.length > 0 ? (
            topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/topics/${topic.slug}`}
                className="group rounded-3xl border border-gray-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{topic.name}</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {topic.parent_category ? `${topic.parent_category} · ` : ""}
                      {topic.description ? topic.description : "Live polls and community conversations."}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">View</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center text-slate-500">
              <p className="text-lg font-medium">No topics found right now.</p>
              <p className="mt-2 text-sm">Try again later or explore the feed.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
