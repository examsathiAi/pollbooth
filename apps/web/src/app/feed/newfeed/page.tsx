"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EnhancedPollCard } from "@/components/feed/EnhancedPollCard";
import { FeedSidebar } from "@/components/layout/FeedSidebar";
import { FeedRightRail } from "@/components/layout/FeedRightRail";
import { TrendingHeader } from "@/components/layout/TrendingHeader";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Loader2, LogOut } from "lucide-react";

export default function NewFeedPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [organicPolls, setOrganicPolls] = useState<any[]>([]);
  const [sponsoredPolls, setSponsoredPolls] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("for-you");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadPolls = useCallback(async (nextPage = 1, reset = false) => {
    setIsLoading(true);
    setError("");
    try {
      const endpoint =
        activeCategory === "trending"
          ? "/api/v1/feed/trending"
          : activeCategory === "saved"
            ? "/api/v1/feed/saved"
            : "/api/v1/feed";

      const res = await api.get(endpoint, { params: { page: nextPage, limit: 8 } });
      const nextOrganic = res.data.organic || [];
      const nextSponsored = res.data.sponsored || [];

      setOrganicPolls((current) => (reset ? nextOrganic : [...current, ...nextOrganic]));
      setSponsoredPolls((current) => (reset ? nextSponsored : [...current, ...nextSponsored]));
      setHasMore((nextOrganic.length + nextSponsored.length) >= 8);
      setPage(nextPage);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load feed");
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    void loadPolls(1, true);
  }, [loadPolls]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Pulse</h1>
          <p className="text-gray-600 mb-6">India&apos;s Opinion Platform</p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Trending Header */}
      <TrendingHeader />

      {/* Main Layout */}
      <div className="flex">
        {/* Left Sidebar */}
        <FeedSidebar activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

        {/* Center Feed */}
        <main className="flex-1 lg:ml-72 xl:mr-80">
          <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Welcome Section */}
            {page === 1 && (
              <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-lg p-6 mb-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Welcome back, {user?.username}!</h2>
                    <p className="text-sm mt-1 opacity-90">See what India is debating today</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{organicPolls.length}</p>
                    <p className="text-xs opacity-75">polls in feed</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && page === 1 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-700 font-semibold">{error}</p>
                <button
                  onClick={() => loadPolls(1, true)}
                  className="mt-3 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition"
                >
                  Try Again
                </button>
              </div>
            ) : organicPolls.length === 0 && sponsoredPolls.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
                <p className="text-xl font-semibold text-gray-900">No polls yet</p>
                <p className="text-gray-600 mt-1">Check back soon for new questions!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Organic Polls */}
                {organicPolls.length > 0 && (
                  <div>
                    {organicPolls.map((poll) => (
                      <div key={poll.id} className="mb-6">
                        <EnhancedPollCard poll={poll} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Sponsored Section */}
                {sponsoredPolls.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4 px-4">
                      <div className="h-1 w-4 bg-amber-500 rounded-full"></div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-amber-700">Featured & Sponsored</h3>
                    </div>
                    <div className="space-y-6">
                      {sponsoredPolls.map((poll) => (
                        <div key={poll.id} className="mb-6">
                          <EnhancedPollCard poll={poll} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center pt-6">
                    <button
                      onClick={() => loadPolls(page + 1)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-full transition shadow-lg"
                    >
                      Load More Polls
                    </button>
                  </div>
                )}

                {/* End of Feed */}
                {!hasMore && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">You&apos;ve seen all available polls</p>
                    <p className="text-gray-400 text-xs mt-1">Check back later for new debates</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Right Rail */}
        <FeedRightRail />
      </div>

      {/* Bottom Navigation for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2">
        <Link href="/feed" className="flex flex-col items-center p-2 text-blue-600 font-semibold text-xs">
          Feed
        </Link>
        <Link href="/discover" className="flex flex-col items-center p-2 text-gray-500 font-semibold text-xs">
          Discover
        </Link>
        <Link href="/profile" className="flex flex-col items-center p-2 text-gray-500 font-semibold text-xs">
          Profile
        </Link>
        <button
          onClick={logout}
          className="flex flex-col items-center p-2 text-gray-500 font-semibold text-xs hover:text-red-600"
        >
          <LogOut className="w-4 h-4 mb-1" />
          Logout
        </button>
      </nav>
    </div>
  );
}
