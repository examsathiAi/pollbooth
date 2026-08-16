"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

interface PollItem {
  id: string;
  question: string;
  category: string;
  status: string;
  total_votes: number;
  created_at: string;
}

export default function CategoryHubPage() {
  const params = useParams<{ category: string }>();
  const category = (params.category || "ALL").toUpperCase();
  const [trending, setTrending] = useState<PollItem[]>([]);
  const [active, setActive] = useState<PollItem[]>([]);
  const [archive, setArchive] = useState<PollItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [trendingRes, activeRes, archiveRes] = await Promise.all([
          api.get(`/api/v1/polls?category=${category}&status=ACTIVE&page=1&limit=3`),
          api.get(`/api/v1/polls?category=${category}&status=ACTIVE&page=1&limit=6`),
          api.get(`/api/v1/polls?category=${category}&status=ARCHIVED&page=1&limit=6`),
        ]);
        setTrending(trendingRes.data.polls || []);
        setActive(activeRes.data.polls || []);
        setArchive(archiveRes.data.polls || []);
      } catch {
        setTrending([]);
        setActive([]);
        setArchive([]);
      }
    };
    load();
  }, [category]);

  return (
    <main className="min-h-screen bg-[#f4efe7] p-6 text-[#1f1b18]">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-maroon">Category hub</p>
          <h1 className="text-3xl font-semibold text-[#1f1b18]">{category}</h1>
        </div>
        <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#1f1b18]">Trending Now</h2>
          <div className="mt-4 space-y-3">
            {trending.map((poll) => (
              <div key={poll.id} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
                <p className="font-medium text-[#1f1b18]">{poll.question}</p>
                <p className="mt-1 text-sm text-[#625a50]">{poll.total_votes} votes</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#1f1b18]">This Week</h2>
          <div className="mt-4 space-y-3">
            {active.map((poll) => (
              <div key={poll.id} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
                <p className="font-medium text-[#1f1b18]">{poll.question}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#1f1b18]">Archive</h2>
          <div className="mt-4 space-y-3">
            {archive.map((poll) => (
              <div key={poll.id} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
                <p className="font-medium text-[#1f1b18]">{poll.question}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
