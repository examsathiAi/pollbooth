"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const categories = [
  { slug: "politics", label: "Politics" },
  { slug: "civic", label: "Civic" },
  { slug: "bollywood", label: "Bollywood" },
  { slug: "sports", label: "Sports" },
  { slug: "current-events", label: "Current Events" },
  { slug: "social", label: "Social" },
];

interface PollSummary {
  id: string;
  question: string;
  category: string;
  status: string;
}

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [polls, setPolls] = useState<PollSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPolls = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ polls?: PollSummary[] }>('/api/v1/polls', {
          params: {
            status: 'ACTIVE',
            page: 1,
            limit: 10,
            search: query.trim(),
          },
        });
        setPolls(res.data.polls || []);
      } catch {
        setPolls([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = window.setTimeout(loadPolls, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <main className="min-h-screen bg-[#f4efe7] px-4 py-6 text-[#1f1b18]">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-maroon">Discover</p>
          <h1 className="text-3xl font-semibold text-[#1f1b18]">Find the conversations that matter</h1>
        </div>

        <div className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-4 shadow-sm">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search polls by question"
            className="w-full rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] px-4 py-3 text-sm text-[#1f1b18] outline-none ring-0"
          />
        </div>

        <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1f1b18]">Browse by category</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/hub/${category.slug}`}
                className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] px-4 py-3 text-sm font-medium text-[#1f1b18] transition hover:border-maroon/40 hover:text-maroon"
              >
                {category.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1f1b18]">Matching polls</h2>
          {loading ? (
            <p className="mt-4 text-sm text-[#625a50]">Searching…</p>
          ) : polls.length === 0 ? (
            <p className="mt-4 text-sm text-[#625a50]">No polls found for that search.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {polls.map((poll) => (
                <Link
                  key={poll.id}
                  href={`/poll/${poll.id}`}
                  className="block rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4 transition hover:border-maroon/40"
                >
                  <p className="text-sm font-medium text-[#1f1b18]">{poll.question}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#625a50]">{poll.category}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
