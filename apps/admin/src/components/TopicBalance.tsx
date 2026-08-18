"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";

interface BalanceItem {
  category: string;
  count: number;
}

export function TopicBalance() {
  const [items, setItems] = useState<BalanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get<BalanceItem[]>("/api/v1/admin/topic-balance");
        setItems(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const maxCount = useMemo(() => Math.max(...items.map((item) => item.count), 1), [items]);

  return (
    <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-maroon">Topic balance</p>
          <h2 className="text-xl font-semibold text-[#1f1b18]">30-day category distribution</h2>
        </div>
        <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] px-3 py-2 text-sm text-[#625a50]">
          <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Stability overview</div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-8 text-center text-sm text-[#625a50]">Loading trend data…</div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.category} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-[#1f1b18]">{item.category}</span>
                <span className="text-[#625a50]">{item.count} polls</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#d8ceb8]">
                <div className="h-full rounded-full bg-gradient-to-r from-maroon to-maroon-dark" style={{ width: `${(item.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-[#d8ceb8] p-3 text-sm text-[#625a50]">
            <BarChart3 className="h-4 w-4 text-maroon" /> Balanced topics help keep the platform reflective across politics, Bollywood and civic issues.
          </div>
        </div>
      )}
    </section>
  );
}
