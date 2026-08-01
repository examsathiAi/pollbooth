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
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">Topic balance</p>
          <h2 className="text-xl font-semibold text-white">30-day category distribution</h2>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-300">
          <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" /> Stability overview</div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center text-sm text-slate-400">Loading trend data…</div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.category} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-200">{item.category}</span>
                <span className="text-slate-400">{item.count} polls</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500" style={{ width: `${(item.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-700 p-3 text-sm text-slate-400">
            <BarChart3 className="h-4 w-4 text-violet-400" /> Balanced topics help keep the platform reflective across politics, Bollywood and civic issues.
          </div>
        </div>
      )}
    </section>
  );
}
