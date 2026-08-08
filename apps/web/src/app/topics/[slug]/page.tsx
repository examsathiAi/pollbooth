import Link from "next/link";
import { EnhancedPollCard } from "@/components/feed/EnhancedPollCard";

export const dynamicParams = true;
export const revalidate = 60;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type Topic = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_category?: string | null;
};

type PollSummary = {
  id: string;
  question: string;
  options: string[];
  category: string;
  total_votes: number;
  total_opinions: number;
  is_commercial?: boolean;
  created_at?: string;
  end_date?: string | null;
  results?: Array<{ option: string; index: number; count: number; percentage: number }>;
};

async function fetchTopic(slug: string) {
  const res = await fetch(`${API_URL}/api/v1/topics/${slug}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as Topic;
}

async function fetchPolls(slug: string, sort: string) {
  const res = await fetch(`${API_URL}/api/v1/topics/${slug}/polls?sort=${sort}&limit=6`, { cache: "no-store" });
  if (!res.ok) return [] as PollSummary[];
  const data = await res.json();
  return (data.polls || []) as PollSummary[];
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const topic = await fetchTopic(params.slug);
  if (!topic) {
    return {
      title: "Topic not found | Pulse",
      description: "The requested topic could not be found.",
      alternates: {
        canonical: `${SITE_URL}/topics/${params.slug}`,
      },
    };
  }

  return {
    title: `${topic.name} | Pulse Topics`,
    description: topic.description || `Latest polls and opinions for ${topic.name}.`,
    openGraph: {
      title: `${topic.name} | Pulse Topics`,
      description: topic.description || `Latest polls and opinions for ${topic.name}.`,
      type: "website",
      images: ["/og-card.png"],
    },
    alternates: {
      canonical: `${SITE_URL}/topics/${params.slug}`,
    },
  };
}

export default async function TopicPage({ params }: { params: { slug: string } }) {
  const topic = await fetchTopic(params.slug);
  if (!topic) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16 text-center text-slate-700">
        <div className="mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-white p-10 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Topic not found</h1>
          <p className="mt-4 text-sm text-slate-500">We could not find that topic. Please check the URL or return to the topics index.</p>
          <div className="mt-6">
            <Link href="/topics" className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
              Back to topics
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [latestPolls, trendingPolls] = await Promise.all([
    fetchPolls(topic.slug, "latest"),
    fetchPolls(topic.slug, "trending"),
  ]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-blue-600">Topic</p>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900">{topic.name}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{topic.description || "Browse the latest polls and popular conversations for this topic."}</p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {topic.parent_category ? `${topic.parent_category} category` : "Topic page"}
            </div>
          </div>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Latest polls</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Fresh conversations</h2>
                </div>
                <Link href="/topics" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                  All topics
                </Link>
              </div>
              <div className="space-y-4">
                {latestPolls.length > 0 ? (
                  latestPolls.map((poll, idx) => <EnhancedPollCard key={poll.id} poll={poll} index={idx} />)
                ) : (
                  <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-slate-500">
                    <p className="text-base font-medium">No recent polls found for this topic yet.</p>
                    <p className="mt-2 text-sm">Check back later or explore other topics.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Trending</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">High engagement</h2>
              </div>
              <div className="space-y-4">
                {trendingPolls.length > 0 ? (
                  trendingPolls.map((poll, idx) => <EnhancedPollCard key={poll.id} poll={poll} index={idx} />)
                ) : (
                  <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-slate-500">
                    <p className="text-base font-medium">No trending polls found for this topic.</p>
                    <p className="mt-2 text-sm">Try another topic or visit the main feed.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Topic details</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div>
                  <p className="font-semibold text-slate-900">Topic slug</p>
                  <p className="truncate">{topic.slug}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Created</p>
                  <p>{/* Placeholder for created date if available in API */}Live topic feed</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Explore more</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <Link href="/feed" className="block hover:text-blue-600">View live feed</Link>
                <Link href="/discover" className="block hover:text-blue-600">Search polls</Link>
                <Link href="/topics" className="block hover:text-blue-600">Browse topics</Link>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
