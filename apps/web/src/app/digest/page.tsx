"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface DigestEntry {
  id: string;
  question: string;
  category: string;
  vote_count: number;
}

export default function DigestPage() {
  const [items, setItems] = useState<DigestEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/v1/feed/digest');
        const digestItems = res.data?.content?.top_polls || [];
        setItems(digestItems.slice(0, 5));
      } catch {
        try {
          const fallback = await api.get('/api/v1/feed/trending?limit=5');
          setItems((fallback.data.organic || []).slice(0, 5).map((poll: any) => ({ id: poll.id, question: poll.question, category: poll.category, vote_count: poll.total_votes })));
        } catch {
          setItems([]);
        }
      }
    };
    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Daily digest</p>
          <h1 className="text-3xl font-semibold">What India Thinks</h1>
        </div>
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">#{index + 1}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{item.question}</h2>
                <p className="mt-1 text-sm text-slate-400">{item.category} • {item.vote_count} votes</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
