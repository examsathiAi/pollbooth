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
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Trending polls</h3>
          </div>
          <div className="space-y-3">
            {trendingPolls.length > 0 ? (
              trendingPolls.map((poll) => (
                <Link key={poll.id} href={`/poll/${poll.id}`} className="block rounded-xl border border-gray-200 p-3 transition hover:border-blue-300 hover:bg-blue-50">
                  <p className="text-sm font-semibold text-gray-900">{poll.question}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
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
              <p className="text-sm text-gray-500">No trending polls are available right now.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">Sponsored</span>
            <h3 className="text-sm font-semibold text-gray-900">Sponsored polls</h3>
          </div>
          <div className="space-y-3">
            {sponsoredPolls.length > 0 ? (
              sponsoredPolls.map((poll) => (
                <Link key={poll.id} href={`/poll/${poll.id}`} className="block rounded-xl border border-amber-200 bg-white p-3 transition hover:border-amber-400">
                  <p className="text-sm font-semibold text-gray-900">{poll.question}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-amber-700">{poll.category}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-600">No sponsored polls are available right now.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-600" />
            <h3 className="text-sm font-semibold text-gray-900">Pulse platform stats</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Users className="h-4 w-4 text-blue-600" />
                <span>Registered users</span>
              </div>
              <p className="mt-1 text-xl font-semibold text-gray-900">{stats?.totals.users.toLocaleString() ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <MessageCircle className="h-4 w-4 text-cyan-600" />
                <span>Polls created</span>
              </div>
              <p className="mt-1 text-xl font-semibold text-gray-900">{stats?.totals.polls.toLocaleString() ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Vote className="h-4 w-4 text-emerald-600" />
                <span>Votes cast</span>
              </div>
              <p className="mt-1 text-xl font-semibold text-gray-900">{stats?.totals.votes.toLocaleString() ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                <span>Recent activity</span>
              </div>
              <p className="mt-1 text-sm font-medium text-gray-700">
                {stats?.recent_activity.votes_last_hour ? `${stats.recent_activity.votes_last_hour.toLocaleString()} voted in the last hour` : "Be the first to vote in the last hour"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
