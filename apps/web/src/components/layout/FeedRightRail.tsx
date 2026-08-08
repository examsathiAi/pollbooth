"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { BarChart3, MessageCircle, TrendingUp, Users, Vote } from "lucide-react";

interface RailPoll {
  id: string;
  question: string;
  category: string;
  total_votes: number;
  total_opinions: number;
  is_commercial?: boolean;
}

interface PlatformStats {
  totals: {
    users: number;
    polls: number;
    votes: number;
  };
  recent_activity: {
    votes_last_hour: number;
  };
}

export function FeedRightRail() {
  const [trendingPolls, setTrendingPolls] = useState<RailPoll[]>([]);
  const [sponsoredPolls, setSponsoredPolls] = useState<RailPoll[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [trendingRes, feedRes, statsRes] = await Promise.all([
          api.get("/api/v1/feed/trending", { params: { limit: 4 } }),
          api.get("/api/v1/feed/trending", { params: { limit: 6 } }),
          api.get<PlatformStats>("/api/v1/feed/stats"),
        ]);
        setTrendingPolls((trendingRes.data.organic || []).slice(0, 4));
        setSponsoredPolls((feedRes.data.sponsored || []).slice(0, 3));
        setStats(statsRes.data);
      } catch {
        setTrendingPolls([]);
        setSponsoredPolls([]);
        setStats(null);
      }
    };

    void load();
  }, []);

  return (
    <aside className="w-full lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <div className="space-y-4">
        <div className="rounded-sm border border-paper-border bg-paper-bg p-4">
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-ink-muted" />
              <h3 className="text-sm font-sans uppercase tracking-widest text-ink border-b-2 border-ink">Trending polls</h3>
            </div>
          </div>
          <div className="space-y-0">
            {trendingPolls.length > 0 ? (
              trendingPolls.map((poll) => (
                <Link key={poll.id} href={`/poll/${poll.id}`} className="block px-3 py-3 border-b border-paper-border transition hover:bg-paper-card">
                  <p className="text-sm font-semibold text-ink">{poll.question}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-ink-muted">
                    <span className="flex items-center gap-1">
                      <Vote className="h-3 w-3" /> {poll.total_votes.toLocaleString()} votes
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" /> {poll.total_opinions.toLocaleString()} opinions
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-ink-muted">No trending polls are available right now.</p>
            )}
          </div>
        </div>

        <div className="rounded-sm border border-paper-border bg-paper-bg p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-paper-card px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-maroon border border-maroon">Sponsored</span>
            <h3 className="text-sm font-sans uppercase tracking-widest text-ink border-b-2 border-ink">Sponsored polls</h3>
          </div>
          <div className="space-y-0">
            {sponsoredPolls.length > 0 ? (
              sponsoredPolls.map((poll) => (
                <Link key={poll.id} href={`/poll/${poll.id}`} className="block px-3 py-3 border-b border-paper-border transition hover:bg-paper-card">
                  <p className="text-sm font-semibold text-ink">{poll.question}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink-muted">{poll.category}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-ink-muted">No sponsored polls are available right now.</p>
            )}
          </div>
        </div>

        <div className="rounded-sm border border-paper-border bg-paper-bg p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-ink-muted" />
            <h3 className="text-sm font-sans uppercase tracking-widest text-ink border-b-2 border-ink">Pulse platform stats</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-sm border border-paper-border bg-paper-card p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Users className="h-4 w-4 text-ink-muted" />
                <span>Registered users</span>
              </div>
              <p className="mt-1 text-xl font-semibold text-ink">{stats?.totals.users.toLocaleString() ?? "—"}</p>
            </div>
            <div className="rounded-sm border border-paper-border bg-paper-card p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <MessageCircle className="h-4 w-4 text-ink-muted" />
                <span>Polls created</span>
              </div>
              <p className="mt-1 text-xl font-semibold text-ink">{stats?.totals.polls.toLocaleString() ?? "—"}</p>
            </div>
            <div className="rounded-sm border border-paper-border bg-paper-card p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Vote className="h-4 w-4 text-ink-muted" />
                <span>Votes cast</span>
              </div>
              <p className="mt-1 text-xl font-semibold text-ink">{stats?.totals.votes.toLocaleString() ?? "—"}</p>
            </div>
            <div className="rounded-sm border border-paper-border bg-paper-card p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <TrendingUp className="h-4 w-4 text-ink-muted" />
                <span>Recent activity</span>
              </div>
              <p className="mt-1 text-sm font-medium text-ink-muted">
                {stats?.recent_activity.votes_last_hour ? `${stats.recent_activity.votes_last_hour.toLocaleString()} voted in the last hour` : "Be the first to vote in the last hour"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
