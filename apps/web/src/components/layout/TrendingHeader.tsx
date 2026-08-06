"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Sparkles, Flame } from "lucide-react";

interface TrendingTopic {
  id: string;
  question: string;
  category: string;
}

export function TrendingHeader({ activeCategory = "For You" }: { activeCategory?: string }) {
  const { user, logout } = useAuth();
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    const loadTopics = async () => {
      try {
        const res = await api.get("/api/v1/polls/feed", { params: { page: 1, limit: 3 } });
        setTopics((res.data.polls || []).slice(0, 3));
      } catch {
        setTopics([]);
      }
    };

    const loadStreak = async () => {
      if (!user) return;
      try {
        const res = await api.get("/api/v1/votes/me/streak");
        setStreak(res.data.current_streak ?? 0);
      } catch {
        setStreak(null);
      }
    };

    void loadTopics();
    void loadStreak();
  }, [user]);

  return (
    <header className="border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">Pulse feed</p>
            <h1 className="text-xl font-semibold text-gray-900">{activeCategory}</h1>
            <p className="text-sm text-gray-600">Live polls and opinions from the database.</p>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link href="/profile" className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 transition hover:bg-gray-100">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 font-semibold text-white">
                    {user.username?.slice(0, 1)?.toUpperCase() || "P"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user.username || user.phone_number || "Pulse member"}</p>
                    <p className="text-xs text-gray-500">{streak !== null ? `${streak} day streak` : "New member"}</p>
                  </div>
                </Link>
                <button onClick={logout} className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">Logout</button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login?mode=login&redirect=/feed" className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">Login</Link>
                <Link href="/auth/login?mode=signup&redirect=/feed" className="rounded-full bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Sign up</Link>
              </div>
            )}
            {user ? <NotificationBell /> : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 px-3 py-3">
          <div className="flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-blue-700">
            <Flame className="h-4 w-4" />
            {user ? `${streak ?? 0} day streak` : "Guest access"}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Verified live polling data
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {topics.length > 0 ? (
            topics.map((topic) => (
              <div key={topic.id} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <span className="font-semibold text-gray-900">{topic.question}</span>
                <span className="ml-2 text-xs uppercase tracking-[0.2em] text-gray-500">{topic.category}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No trending topics are available right now.</p>
          )}
        </div>
      </div>
    </header>
  );
}
