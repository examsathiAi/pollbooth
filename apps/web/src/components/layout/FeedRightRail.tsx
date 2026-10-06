"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface RailPoll { id: string; question: string; category: string; total_votes: number; is_commercial?: boolean }
interface PlatformStats {
  totals: { users: number; polls: number; votes: number };
  recent_activity: { votes_last_hour: number };
}

const fmt = (n: number) => (n || 0).toLocaleString("en-IN");
const cardCls = "rounded-xl border border-paper-border/60 bg-paper-bg p-4";
const headCls = "mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted";
const clamp2 = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as const;

function Skeleton() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2].map((i) => <div key={i} className="h-4 animate-pulse rounded bg-paper-border/40" />)}
    </div>
  );
}

function PollLink({ poll }: { poll: RailPoll }) {
  return (
    <Link href={"/poll/" + poll.id} className="-mx-2 block rounded-lg px-2 py-2 transition-colors hover:bg-paper-card">
      <p style={clamp2} className="text-[13px] font-medium leading-snug text-ink">{poll.question}</p>
      <p className="mt-0.5 text-[11px] text-ink-muted">{fmt(poll.total_votes)} votes</p>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold tabular-nums text-ink">{fmt(value)}</dd>
    </div>
  );
}

export function FeedRightRail() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [trending, setTrending] = useState<RailPoll[]>([]);
  const [sponsored, setSponsored] = useState<RailPoll[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [feedRes, statsRes] = await Promise.allSettled([
        api.get("/api/v1/feed/trending", { params: { limit: 8 } }),
        api.get<PlatformStats>("/api/v1/feed/stats"),
      ]);
      if (cancelled) return;
      if (feedRes.status === "fulfilled") {
        const d = feedRes.value.data || {};
        setSponsored(((d.sponsored || []) as RailPoll[]).slice(0, 2));
        setTrending(((d.organic || []) as RailPoll[]).slice(0, 4));
      }
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      setLoaded(true);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const lastHour = stats?.recent_activity?.votes_last_hour || 0;

  return (
    <aside className="w-full lg:max-h-full lg:overflow-y-auto scrollbar-paper">
      <div className="space-y-3">
        {(!loaded || stats) && (
          <section className={cardCls}>
            <div className="mb-3 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Platform pulse</h3>
            </div>
            {!loaded || !stats ? (
              <Skeleton />
            ) : (
              <>
                <dl className="space-y-2 text-[13px]">
                  <Row label="Votes cast" value={stats.totals.votes} />
                  <Row label="Polls" value={stats.totals.polls} />
                  <Row label="Members" value={stats.totals.users} />
                </dl>
                {lastHour > 0 && (
                  <p className="mt-3 border-t border-paper-border/40 pt-3 text-[12px] text-ink-muted">
                    <span className="font-semibold text-emerald-700">{fmt(lastHour)}</span> voted in the last hour
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {trending.length > 0 && (
          <section className={cardCls}>
            <p className={headCls}>Trending now</p>
            {trending.map((p) => <PollLink key={p.id} poll={p} />)}
          </section>
        )}

        {sponsored.length > 0 && (
          <section className={cardCls}>
            <p className={headCls}>Sponsored</p>
            {sponsored.map((p) => <PollLink key={p.id} poll={p} />)}
          </section>
        )}
      </div>
    </aside>
  );
}
