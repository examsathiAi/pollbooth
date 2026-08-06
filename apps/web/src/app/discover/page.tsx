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
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Discover</p>
          <h1 className="text-3xl font-semibold">Find the conversations that matter</h1>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-black/20">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search polls by question"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none ring-0"
          />
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold">Browse by category</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/hub/${category.slug}`}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-500/50 hover:text-white"
              >
                {category.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold">Matching polls</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Searching…</p>
          ) : polls.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No polls found for that search.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {polls.map((poll) => (
                <Link
                  key={poll.id}
                  href={`/poll/${poll.id}`}
                  className="block rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-cyan-500/50"
                >
                  <p className="text-sm font-medium text-white">{poll.question}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{poll.category}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
