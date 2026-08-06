"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface BadgeItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  icon_url?: string | null;
  earned_at?: string | null;
}

export default function BadgesPage() {
  const [earned, setEarned] = useState<BadgeItem[]>([]);
  const [catalog, setCatalog] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{ earned: BadgeItem[]; catalog: BadgeItem[] }>('/api/v1/badges/me');
        setEarned(res.data.earned || []);
        setCatalog(res.data.catalog || []);
      } catch {
        setEarned([]);
        setCatalog([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Badges</p>
          <h1 className="text-3xl font-semibold">Your achievements</h1>
        </div>
        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center text-sm text-slate-400">Loading badges…</div>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold">Earned</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {earned.map((badge) => (
                  <div key={badge.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="font-semibold text-white">{badge.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{badge.description}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold">Locked</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {catalog.filter((badge) => !earned.some((earnedBadge) => earnedBadge.id === badge.id)).map((badge) => (
                  <div key={badge.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="font-semibold text-white">{badge.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{badge.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
