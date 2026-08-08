"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EnhancedPollCard } from "@/components/feed/EnhancedPollCard";
import { FeedSidebar } from "@/components/layout/FeedSidebar";
import { FeedRightRail } from "@/components/layout/FeedRightRail";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface PollSummary {
  id: string;
  question: string;
  options: string[];
  category: string;
  total_votes: number;
  total_opinions: number;
  has_voted?: boolean;
  has_opinion?: boolean;
  results?: Array<{ option: string; index: number; count: number; percentage: number }>;
  user_vote_index?: number | null;
  user_opinion?: { id: string; content: string; agree_count: number; disagree_count: number } | null;
  is_commercial?: boolean;
  created_at?: string;
  end_date?: string | null;
}

const categoryAccentMap: Record<string, { ring: string; bg: string; text: string; icon: string }> = {
  civic: { ring: "border-cyan-500", bg: "bg-cyan-50", text: "text-cyan-700", icon: "🏛️" },
  sports: { ring: "border-orange-500", bg: "bg-orange-50", text: "text-orange-700", icon: "⚽" },
  bollywood: { ring: "border-pink-500", bg: "bg-pink-50", text: "text-pink-700", icon: "🎬" },
  news: { ring: "border-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", icon: "📰" },
  local: { ring: "border-indigo-500", bg: "bg-indigo-50", text: "text-indigo-700", icon: "📍" },
  default: { ring: "border-blue-500", bg: "bg-blue-50", text: "text-blue-700", icon: "📊" },
};

export default function FeedPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(96);
  const [todayStr, setTodayStr] = useState("");
  const [organicPolls, setOrganicPolls] = useState<PollSummary[]>([]);
  const [sponsoredPolls, setSponsoredPolls] = useState<PollSummary[]>([]);
  const [activeCategory, setActiveCategory] = useState("for-you");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hotPolls, setHotPolls] = useState<PollSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PollSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleCategoryChange = (category: string, categoryApiFilter?: string) => {
    setActiveCategory(category);
    setCategoryFilter(categoryApiFilter);
    setSearchQuery("");
    setIsSearching(false);
    setSearchResults([]);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const allPolls = [...organicPolls, ...sponsoredPolls];
    const filtered = allPolls.filter((poll) =>
      poll.question.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
  };

  useEffect(() => {
    setTodayStr(new Date().toLocaleDateString());
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    const updateHeight = () => {
      setHeaderHeight(headerRef.current?.getBoundingClientRect().height || 96);
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(() => updateHeight());
    resizeObserver.observe(headerRef.current);

    const onWindowResize = () => updateHeight();
    window.addEventListener("resize", onWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, []);

  const loadHotPolls = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/feed/trending", { params: { limit: 8 } });
      const basePolls = [...(res.data.organic || []), ...(res.data.sponsored || [])] as PollSummary[];
      const uniquePolls = Array.from(new Map(basePolls.map((poll) => [poll.id, poll])).values());
      const hydratedPolls = await Promise.all(
        uniquePolls.slice(0, 8).map(async (poll) => {
          try {
            const detailRes = await api.get(`/api/v1/polls/${poll.id}`);
            return {
              ...poll,
              results: detailRes.data.results || [],
              total_votes: detailRes.data.total_votes ?? poll.total_votes,
              total_opinions: detailRes.data.total_opinions ?? poll.total_opinions,
            } as PollSummary;
          } catch {
            return poll;
          }
        })
      );

      const sortedPolls = hydratedPolls
        .sort((left, right) => (right.total_votes || 0) - (left.total_votes || 0))
        .slice(0, 8);
      setHotPolls(sortedPolls);
    } catch {
      setHotPolls([]);
    }
  }, []);

  const loadPolls = useCallback(async (nextPage = 1, reset = false) => {
    setIsLoading(true);
    setError("");
    try {
      const params: Record<string, unknown> = { page: nextPage, limit: 8 };
      if (categoryFilter) {
        params.category = categoryFilter;
      }

      const guestSessionId = typeof window !== "undefined" ? window.localStorage.getItem("pulse_guest_session") || undefined : undefined;
      const headers: Record<string, string> = {};
      if (guestSessionId) {
        headers["x-pulse-guest-session"] = guestSessionId;
      }

      const res = await api.get("/api/v1/polls/feed", { params, headers });
      const basePolls = (res.data.polls || []) as PollSummary[];
      const hydratedPolls = await Promise.all(
        basePolls.map(async (poll) => {
          try {
            const detailRes = await api.get(`/api/v1/polls/${poll.id}`);
            return {
              ...poll,
              has_voted: detailRes.data.has_voted ?? false,
              has_opinion: detailRes.data.has_opinion ?? false,
              user_vote_index: detailRes.data.user_vote_index ?? null,
              user_opinion: detailRes.data.user_opinion ?? null,
              results: detailRes.data.results || [],
              total_votes: detailRes.data.total_votes ?? poll.total_votes,
              total_opinions: detailRes.data.total_opinions ?? poll.total_opinions,
              end_date: detailRes.data.end_date ?? null,
            } as PollSummary;
          } catch {
            return poll;
          }
        })
      );

      const nextOrganic = hydratedPolls.filter((poll) => !poll.is_commercial);
      const nextSponsored = hydratedPolls.filter((poll) => poll.is_commercial);

      setOrganicPolls((current) => (reset ? nextOrganic : [...current, ...nextOrganic]));
      setSponsoredPolls((current) => (reset ? nextSponsored : [...current, ...nextSponsored]));
      setHasMore(nextPage < (res.data.pagination?.total_pages || 1));
      setPage(nextPage);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load feed");
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    void loadPolls(1, true);
  }, [loadPolls]);

  useEffect(() => {
    void loadHotPolls();
  }, [activeCategory, categoryFilter, loadHotPolls]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-bg">
        <Loader2 className="h-8 w-8 animate-spin text-maroon" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header ref={headerRef} className="sticky top-0 z-50 border-b-2 border-ink bg-paper-bg text-ink paper-texture">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-4xl font-headline font-bold text-maroon">Pulse Times</div>

            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search polls…"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full border border-ink bg-paper-card px-3 py-2 text-sm font-sans rounded-sm focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link href="/profile" className="text-sm font-sans uppercase tracking-widest text-ink-muted">{user.username || "User"}</Link>
                  <button onClick={() => logout()} className="px-3 py-1 text-xs font-sans uppercase tracking-widest text-ink-muted hover:bg-paper-card/60">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login?mode=login&redirect=/feed" className="px-3 py-1 text-xs font-sans uppercase tracking-widest text-ink-muted border border-transparent hover:border-paper-border">
                    Login
                  </Link>
                  <Link href="/auth/login?mode=signup&redirect=/feed" className="px-3 py-1 text-xs font-sans uppercase tracking-widest text-white bg-maroon hover:bg-maroon-dark">
                    Sign up
                  </Link>
                </>
              )}
              <NotificationBell />
            </div>
          </div>

          <div className="mt-2 border-t border-paper-border pt-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-sans uppercase tracking-widest text-ink-muted">{(function(){
                const map: Record<string,string> = {
                  "for-you": "FOR YOU",
                  "trending": "TRENDING",
                  "local": "LOCAL",
                  "news": "NEWS",
                  "bollywood": "BOLLYWOOD",
                  "sports": "SPORTS",
                  "civic": "CIVIC",
                };
                return (map[activeCategory] || activeCategory.toUpperCase()) + " EDITION";
              })()}</div>
              <div className="text-xs font-sans uppercase tracking-widest text-ink-muted">{todayStr}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:grid lg:grid-cols-[220px,minmax(0,1fr),320px] lg:gap-6" style={{ height: `calc(100vh - ${headerHeight}px)` }}>
        <div className="hidden lg:block lg:self-start" style={{ position: "sticky", top: `${headerHeight}px` }}>
          <FeedSidebar activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />
        </div>

        <main className="min-w-0 lg:overflow-y-auto" style={{ maxHeight: `calc(100vh - ${headerHeight}px)` }}>
          <div className="mx-auto max-w-2xl">
            {isSearching && searchQuery ? (
              <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Search results for &quot;{searchQuery}&quot;</h2>
                {searchResults.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.map((poll, idx) => (
                      <EnhancedPollCard key={poll.id} poll={poll} index={idx} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-sm border border-paper-border bg-paper-card p-8 text-center">
                    <p className="text-ink-muted">No polls found for &quot;{searchQuery}&quot;</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {page === 1 && hotPolls.length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-ink-muted">Hot Polls 🔥</h3>
                    <div className="overflow-x-auto pb-2">
                      <div className="flex gap-3">
                        {hotPolls.map((poll) => {
                          const winningResult = [...(poll.results || [])].sort((left, right) => right.percentage - left.percentage)[0];
                          const winningPercent = winningResult ? Math.round(winningResult.percentage) : Math.min(92, Math.max(12, Math.round((poll.total_votes || 0) % 90)) + 10);
                          const accent = categoryAccentMap[poll.category?.toLowerCase()] || categoryAccentMap.default;
                          const label = poll.question.length > 34 ? `${poll.question.slice(0, 34)}…` : poll.question;

                          return (
                            <Link key={poll.id} href={`/poll/${poll.id}`} className="min-w-[160px] rounded-sm border border-paper-border bg-paper-card p-3 transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02]">
                              <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-2xl ${accent.bg} ${accent.text}`}>
                                <span className="text-lg font-bold text-maroon">{winningPercent}%</span>
                              </div>
                              <p className="text-[13px] font-semibold leading-5 text-ink">{label}</p>
                              <p className="mt-2 text-[12px] leading-5 text-ink-muted">
                                {winningPercent}% voted for {winningResult?.option ? <>&quot;{winningResult.option}&quot;</> : "the leading option"}
                              </p>
                              <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ink-muted">{poll.category.replace(/_/g, " ")}</p>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {isLoading && page === 1 ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-maroon" />
                    </div>
                  ) : error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
                  ) : organicPolls.length > 0 ? (
                    organicPolls.map((poll, idx) => <EnhancedPollCard key={poll.id} poll={poll} index={idx} />)
                  ) : (
                    <div className="rounded-sm border border-paper-border bg-paper-card p-8 text-center">
                      <p className="text-ink-muted">No polls available</p>
                    </div>
                  )}
                </div>

                {hasMore && !isLoading && organicPolls.length > 0 && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => void loadPolls(page + 1)}
                      className="rounded-sm border border-paper-border bg-paper-card px-6 py-2 text-sm font-medium text-ink hover:bg-paper-border"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <div className="hidden lg:block lg:self-start" style={{ position: "sticky", top: `${headerHeight}px` }}>
          <FeedRightRail />
        </div>
      </div>
    </div>
  );
}
