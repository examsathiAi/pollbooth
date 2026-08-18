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
    <main className="min-h-screen bg-[#f4efe7] p-6 text-[#1f1b18]">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-maroon">Badges</p>
          <h1 className="text-3xl font-semibold text-[#1f1b18]">Your achievements</h1>
        </div>
        {loading ? (
          <div className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-8 text-center text-sm text-[#625a50]">Loading badges…</div>
        ) : (
          <>
            <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1f1b18]">Earned</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {earned.map((badge) => (
                  <div key={badge.id} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
                    <p className="font-semibold text-[#1f1b18]">{badge.name}</p>
                    <p className="mt-1 text-sm text-[#625a50]">{badge.description}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1f1b18]">Locked</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {catalog.filter((badge) => !earned.some((earnedBadge) => earnedBadge.id === badge.id)).map((badge) => (
                  <div key={badge.id} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
                    <p className="font-semibold text-[#1f1b18]">{badge.name}</p>
                    <p className="mt-1 text-sm text-[#625a50]">{badge.description}</p>
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
