import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 60;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pollbooth.in";

type Topic = { id: string; name: string; slug: string; description?: string | null };
type Poll = {
  id: string;
  question: string;
  options?: string[];
  end_date?: string | null;
  _count?: { votes?: number; opinions?: number };
};

async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  const body = await res.json();
  return body && typeof body === "object" ? (body as T) : null;
}

function niceName(name: string) {
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function load(slug: string) {
  const topic = await getJson<Topic>(`/api/v1/topics/${encodeURIComponent(slug)}`);
  if (!topic || !topic.slug) return null;
  const data = await getJson<{ polls?: Poll[] }>(
    `/api/v1/topics/${encodeURIComponent(topic.slug)}/polls?sort=latest&limit=12`
  );
  return { topic, polls: data?.polls ?? [] };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await load(params.slug);
  if (!data) return { title: "Topic not found", robots: { index: false, follow: false } };
  const name = niceName(data.topic.name);
  const title = `${name} polls: vote and see what India thinks`;
  const description =
    data.topic.description ||
    `Live ${name} polls on PollBooth. Cast your vote, see how India is voting, and join the discussion.`;
  const url = `${SITE_URL}/topics/${data.topic.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: data.polls.length === 0 ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url, type: "website", images: ["/og-card.png"] },
  };
}

export default async function TopicPage({ params }: { params: { slug: string } }) {
  const data = await load(params.slug);
  if (!data) notFound();
  const { topic, polls } = data;
  const name = niceName(topic.name);

  return (
    <main className="w-full bg-[#f4efe7] px-4 py-8 text-[#1f1b18] sm:px-6">
      <div className="mx-auto max-w-2xl">
        <nav className="text-sm text-[#625a50]">
          <Link href="/topics" className="hover:text-[#7a1f10]">Topics</Link> / {name}
        </nav>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl" style={{ fontFamily: "var(--font-headline)" }}>
          {name} polls
        </h1>
        <p className="mt-3 text-base leading-7 text-[#625a50]">
          {topic.description || `Vote on the latest ${name} questions and see how India is voting.`}
        </p>

        {polls.length > 0 ? (
          <ul className="mt-6 space-y-3">
            {polls.map((poll) => {
              const votes = poll._count?.votes ?? 0;
              const closed = poll.end_date ? new Date(poll.end_date).getTime() < Date.now() : false;
              return (
                <li key={poll.id}>
                  <Link
                    href={`/poll/${poll.id}`}
                    className="block rounded-2xl border border-[#d8ceb8] bg-[#fffdf9] p-4 transition hover:border-[#7a1f10]"
                  >
                    <p className="text-[17px] font-semibold leading-snug">{poll.question}</p>
                    <p className="mt-2 text-sm text-[#625a50]">
                      {votes === 1 ? "1 vote" : `${votes.toLocaleString("en-IN")} votes`}
                      {closed ? " · Voting closed" : " · Open to vote"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-[#d8ceb8] bg-[#fffdf9] p-8 text-center text-[#625a50]">
            <p className="font-medium">No polls in this topic yet.</p>
            <Link href="/" className="mt-3 inline-block text-sm font-semibold text-[#7a1f10]">See live polls</Link>
          </div>
        )}
      </div>
    </main>
  );
}
