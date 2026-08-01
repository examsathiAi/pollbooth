"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { PollCard } from "@/components/feed/PollCard";
import { Loader2, ThumbsUp, ThumbsDown, Flag } from "lucide-react";

export default function PollDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [poll, setPoll] = useState<any>(null);
  const [opinions, setOpinions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newOpinion, setNewOpinion] = useState("");
  const [sortBy, setSortBy] = useState("TOP");

  useEffect(() => {
    loadPoll();
  }, [id]);

  const loadPoll = async () => {
    setIsLoading(true);
    try {
      const [pollRes, opinionsRes] = await Promise.all([
        api.get(`/api/v1/polls/${id}`),
        api.get(`/api/v1/opinions/${id}/opinions?sort=${sortBy}`),
      ]);
      setPoll(pollRes.data);
      setOpinions(opinionsRes.data.opinions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const submitOpinion = async () => {
    if (!user) {
      window.location.href = `/auth/login?redirect=/poll/${id}`;
      return;
    }
    if (!newOpinion.trim() || newOpinion.length > 280) {
      alert("Opinion must be 1-280 characters");
      return;
    }
    try {
      await api.post(`/api/v1/polls/${id}/opinion`, { content: newOpinion.trim() });
      setNewOpinion("");
      loadPoll();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to post opinion");
    }
  };

  const reactToOpinion = async (opinionId: string, reaction: "AGREE" | "DISAGREE") => {
    if (!user) return;
    try {
      await api.post(`/api/v1/opinions/${opinionId}/react`, { reaction_type: reaction });
      loadPoll();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to react");
    }
  };

  const reportOpinion = async (opinionId: string) => {
    if (!user) return;
    try {
      await api.post(`/api/v1/moderation/${opinionId}/report`, {});
      alert("Report submitted. Thank you for keeping Pulse safe.");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to report");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        Poll not found
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-white">
      <header className="sticky top-0 bg-white border-b z-10 px-4 py-3">
        <a href="/feed" className="text-blue-600 text-sm font-medium">? Back to Feed</a>
      </header>

      <main>
        <PollCard poll={poll} />

        {/* Opinion Composer */}
        {poll.has_voted && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex gap-2">
              <textarea
                value={newOpinion}
                onChange={(e) => setNewOpinion(e.target.value)}
                placeholder="Share your opinion (280 chars max)..."
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none text-sm"
                rows={3}
                maxLength={280}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className={`text-xs ${newOpinion.length > 250 ? "text-red-500" : "text-gray-400"}`}>
                {newOpinion.length}/280
              </span>
              <button
                onClick={submitOpinion}
                disabled={!newOpinion.trim()}
                className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Post
              </button>
            </div>
          </div>
        )}

        {/* Sort */}
        <div className="flex gap-2 px-4 py-3 border-b border-gray-100">
          {["TOP", "NEWEST", "CONTROVERSIAL"].map((sort) => (
            <button
              key={sort}
              onClick={() => { setSortBy(sort); loadPoll(); }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                sortBy === sort ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {sort}
            </button>
          ))}
        </div>

        {/* Opinions */}
        <div className="divide-y divide-gray-50">
          {opinions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No opinions yet. Be the first to share yours!
            </div>
          ) : (
            opinions.map((op) => (
              <div key={op.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {op.demographic_hint && (
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {op.demographic_hint}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 leading-relaxed mb-3">{op.content}</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => reactToOpinion(op.id, "AGREE")}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                      op.user_reaction === "AGREE" ? "text-blue-600" : "text-gray-400 hover:text-blue-500"
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {op.agree_count}
                  </button>
                  <button
                    onClick={() => reactToOpinion(op.id, "DISAGREE")}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                      op.user_reaction === "DISAGREE" ? "text-red-500" : "text-gray-400 hover:text-red-400"
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    {op.disagree_count}
                  </button>
                  <button
                    onClick={() => reportOpinion(op.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors ml-auto"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    Report
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
