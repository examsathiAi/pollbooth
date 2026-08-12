"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Share2, Sparkles, ThumbsDown, ThumbsUp, Flag } from "lucide-react";
import { EnhancedPollCard } from "@/components/feed/EnhancedPollCard";

interface PollDetailClientProps {
  pollId: string;
  initialPoll: any | null;
}

export function PollDetailClient({ pollId, initialPoll }: PollDetailClientProps) {
  const { user } = useAuth();
  const [poll, setPoll] = useState<any>(initialPoll);
  const [opinions, setOpinions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(Boolean(initialPoll?.has_voted));
  const [newOpinion, setNewOpinion] = useState("");
  const [sortBy, setSortBy] = useState("TOP");
  const [cohort, setCohort] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<number | null>(initialPoll?.user_prediction ?? null);
  const [predictionInput, setPredictionInput] = useState(initialPoll?.user_prediction?.toString() || "");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const predictionBands = useMemo(
    () => [
      { label: "0–20%", value: 10 },
      { label: "21–40%", value: 30 },
      { label: "41–60%", value: 50 },
      { label: "61–80%", value: 70 },
      { label: "81–100%", value: 90 },
    ],
    []
  );

  const topResult = useMemo(() => poll?.results?.[0] || null, [poll?.results]);

  const loadPoll = useCallback(async (sort = sortBy) => {
    setIsLoading(true);
    try {
      const [pollRes, opinionsRes, relatedRes] = await Promise.all([
        api.get(`/api/v1/polls/${pollId}`),
        api.get(`/api/v1/opinions/${pollId}/opinions?sort=${sort}`),
        api.get(`/api/v1/feed/related/${pollId}?limit=4`).catch(() => ({ data: [] })),
      ]);
      setPoll(pollRes.data);
      setHasVoted(Boolean(pollRes.data.has_voted));
      setOpinions(opinionsRes.data.opinions || []);
      setRelated(relatedRes.data || []);
      setPrediction(pollRes.data.user_prediction ?? null);
      setPredictionInput(pollRes.data.user_prediction?.toString() || "");
      if (pollRes.data.has_voted) {
        try {
          const cohortRes = await api.get(`/api/v1/votes/${pollId}/cohort`);
          setCohort(cohortRes.data);
        } catch {
          setCohort(null);
        }
      }
    } catch (err) {
      console.error(err);
      setMessage("This poll could not be loaded right now.");
    } finally {
      setIsLoading(false);
    }
  }, [pollId, sortBy]);

  useEffect(() => {
    const load = async () => {
      if (!poll?.id) {
        await loadPoll();
      } else {
        setIsLoading(false);
      }
    };
    void load();
  }, [poll?.id, pollId, loadPoll]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(`pulse-cohort:${pollId}`);
      if (saved) {
        setCohort(saved);
      }
    }
  }, [pollId]);

  const submitPrediction = async () => {
    if (!user) {
      window.location.href = `/auth/login?redirect=/poll/${pollId}`;
      return;
    }
    const value = Number(predictionInput);
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      setMessage("Choose a prediction bracket first.");
      return;
    }
    try {
      setIsSubmitting(true);
      await api.post(`/api/v1/polls/${pollId}/predict`, { predicted_percentage: value });
      setPrediction(value);
      setPredictionInput(value.toString());
      setMessage("Prediction saved. We’ll notify you when the poll closes if your bracket lands correctly.");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Failed to save prediction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoteComplete = async () => {
    setHasVoted(true);
    await loadPoll();
  };

  const submitOpinion = async () => {
    if (!user) {
      window.location.href = `/auth/login?redirect=/poll/${pollId}`;
      return;
    }
    if (!newOpinion.trim() || newOpinion.length > 280) {
      alert("Opinion must be 1-280 characters");
      return;
    }
    try {
      await api.post(`/api/v1/opinions/${pollId}/opinion`, { content: newOpinion.trim() });
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

  const commentBannedUntil = user?.moderation?.comment_banned_until ? new Date(user.moderation.comment_banned_until) : null;
  const isCommentFeatureDisabled = Boolean(
    user?.moderation?.is_permanently_banned ||
      (commentBannedUntil && commentBannedUntil > new Date())
  );
  const commentDisableMessage = user?.moderation?.is_permanently_banned
    ? "Your opinion feature has been disabled due to repeated policy violations. You can still vote on polls."
    : commentBannedUntil
    ? `Your opinion feature is disabled until ${commentBannedUntil.toLocaleDateString()}. Please keep things respectful.`
    : "";

  if (isLoading && !poll) {
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
        <Link href="/feed" className="text-blue-600 text-sm font-medium">← Back to Feed</Link>
      </header>

      <main>
        <EnhancedPollCard poll={poll} onVoteComplete={handleVoteComplete} />

        {poll.has_voted && cohort ? (
          <div className="m-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-semibold">People like you voted</p>
            <p className="mt-1">
              {cohort.cohort_breakdown?.find((item: any) => item.option_index === cohort.user_vote_index)?.percentage || 0}% of people in your age group / city voted the same way.
            </p>
          </div>
        ) : null}

        {poll.status === "ACTIVE" && !poll.has_voted ? (
          <div className="m-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Pulse Predicts</p>
            <p className="mt-1 text-sm text-slate-500">Choose the percentage bracket you think will win this poll.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {predictionBands.map((band) => (
                <button
                  key={band.label}
                  type="button"
                  onClick={() => {
                    setPredictionInput(band.value.toString());
                    setMessage("");
                  }}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                    predictionInput === band.value.toString()
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  {band.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Your saved bracket will be evaluated once the poll closes.</p>
              <button
                onClick={submitPrediction}
                disabled={isSubmitting || !predictionInput}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Save prediction"}
              </button>
            </div>
            {prediction !== null ? <p className="mt-2 text-sm text-slate-600">Your prediction: {prediction}%</p> : null}
            {message ? <p className="mt-2 text-sm text-blue-700">{message}</p> : null}
          </div>
        ) : null}

        {related.length > 0 ? (
          <div className="border-b border-gray-100 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">You might also want to vote on</p>
            <div className="flex gap-3 overflow-x-auto">
              {related.map((item) => (
                <Link key={item.id} href={`/poll/${item.id}`} className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">{item.question}</p>
                  <p className="mt-2 text-xs text-slate-500">{item.total_votes} votes • {item.total_opinions} opinions</p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="m-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Discussion thread</p>
          <p className="mt-1 text-sm text-slate-500">Share your view, react to others, and keep the conversation moving in a safe public space.</p>
        </div>

        {(hasVoted || poll.has_voted) && (
          <div className="p-4 border-b border-gray-100">
            {isCommentFeatureDisabled ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <p className="font-semibold">Commenting disabled</p>
                <p className="mt-2 text-sm text-rose-700">{commentDisableMessage}</p>
              </div>
            ) : !user ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <p className="font-semibold">You need an account to post a comment.</p>
                <p className="mt-1 text-sm text-blue-700">Comments are readable publicly, but only registered members can join the thread.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/auth/login?mode=login&redirect=/poll/${pollId}`} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-100">
                    Sign in
                  </Link>
                  <Link href={`/auth/login?mode=signup&redirect=/poll/${pollId}`} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                    Create account
                  </Link>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        <div className="flex gap-2 px-4 py-3 border-b border-gray-100">
          {['TOP', 'NEWEST', 'CONTROVERSIAL'].map((sort) => (
            <button
              key={sort}
              onClick={() => {
                setSortBy(sort);
                loadPoll(sort);
              }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                sortBy === sort ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {sort}
            </button>
          ))}
        </div>

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
