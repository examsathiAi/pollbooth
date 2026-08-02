"use client";

import { useEffect, useState } from "react";
import { PollCard } from "@/components/feed/PollCard";
import { ProfileBadges } from "@/components/feed/ProfileBadges";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

const TABS = [
  { id: "for-you", label: "For You" },
  { id: "trending", label: "Trending" },
  { id: "local", label: "Local" },
  { id: "news", label: "News" },
  { id: "bollywood", label: "Bollywood" },
  { id: "sports", label: "Sports" },
];

export default function FeedPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [organicPolls, setOrganicPolls] = useState<any[]>([]);
  const [sponsoredPolls, setSponsoredPolls] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("for-you");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPolls();
  }, [activeTab]);

  const loadPolls = async () => {
    setIsLoading(true);
    setError("");
    try {
      const endpoint = activeTab === "trending" ? "/feed/trending" : "/feed";
      const res = await api.get(endpoint);
      setOrganicPolls(res.data.organic || []);
      setSponsoredPolls(res.data.sponsored || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load feed");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-white shadow-sm">
      <header className="sticky top-0 bg-white border-b z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-blue-700">Pulse</h1>
          {user ? (
            <span className="text-sm text-gray-600">@{user.username || "User"}</span>
          ) : (
            <a href="/auth/login" className="text-sm font-medium text-blue-600">Login</a>
          )}
        </div>
        <div className="flex overflow-x-auto scrollbar-hide border-t">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="pb-20">
        <div className="px-4 py-4">
          <ProfileBadges />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : organicPolls.length === 0 && sponsoredPolls.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg font-medium">No polls yet</p>
            <p className="text-sm mt-1">Check back soon for new questions!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {organicPolls.length > 0 && (
              <div>
                {organicPolls.map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
            )}
            {sponsoredPolls.length > 0 && (
              <div className="border-t border-amber-100 bg-amber-50/60">
                <div className="px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
                  Sponsored
                </div>
                {sponsoredPolls.map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t max-w-lg mx-auto">
        <div className="flex justify-around py-2">
          <a href="/feed" className="flex flex-col items-center p-2 text-blue-600">
            <span className="text-xs font-medium">Feed</span>
          </a>
          <a href="/discover" className="flex flex-col items-center p-2 text-gray-500">
            <span className="text-xs font-medium">Discover</span>
          </a>
          <a href="/profile" className="flex flex-col items-center p-2 text-gray-500">
            <span className="text-xs font-medium">Profile</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
