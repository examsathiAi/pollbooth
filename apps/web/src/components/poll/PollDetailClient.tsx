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
      const saved = window.localStorage.getItem(`pollbooth-cohort:${pollId}`);
      if (saved) {
        setCohort(saved);
      }
    }
  }, [pollId]);

  const submitPrediction = async () => {
    if (!user) {
      window.location.href = `/auth/login?mode=login&redirect=/poll/${pollId}`;
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
      window.location.href = `/auth/login?mode=login&redirect=/poll/${pollId}`;
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
    if (!user) {
      window.location.href = `/auth/login?mode=login&redirect=/poll/${pollId}`;
      return;
    }
    try {
      await api.post(`/api/v1/opinions/${opinionId}/react`, { reaction_type: reaction });
      loadPoll();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to react");
    }
  };

  const reportOpinion = async (opinionId: string) => {
    if (!user) {
      window.location.href = `/auth/login?mode=login&redirect=/poll/${pollId}`;
      return;
    }
    try {
      await api.post(`/api/v1/moderation/${opinionId}/report`, {});
      alert("Report submitted. Thank you for keeping PollBooth safe.");
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
        <div className="max-w-lg mx-auto min-h-screen bg-transparent transition-colors duration-300">
      <header className="sticky top-0 bg-white/70 backdrop-blur-xl border-b border-paper-border/50 z-20 px-2 py-2 transition-all duration-300">
        <Link href="/feed" className="group inline-flex items-center justify-center w-10 h-10 rounded-full bg-transparent hover:bg-ink/5 transition-all duration-200 ease-out active:scale-[0.92]">
          <svg className="w-5 h-5 text-ink-muted group-hover:text-ink transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      </header>

            <main>
        {(poll as any).ai_summary ? (
          <div className="mx-4 mt-4 mb-2 overflow-hidden rounded-3xl border border-paper-border/60 bg-transparent p-5 shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-3 border-b border-paper-border/40 pb-3">
              <svg className="w-4 h-4 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink">Context & Insights</h2>
            </div>
            <div className="text-sm leading-relaxed text-ink/90 whitespace-pre-wrap font-sans">
              {(poll as any).ai_summary}
            </div>
          </div>
        ) : null}

        <EnhancedPollCard poll={poll} onVoteComplete={handleVoteComplete} />

                {poll.has_voted && cohort ? (
          <div className="mx-4 my-4 rounded-2xl border border-ink/10 bg-ink/5 p-4 transition-all duration-300">
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-semibold tracking-tight text-ink">People like you voted</p>
            </div>
            <p className="text-sm text-ink-muted ml-6">
              {cohort.cohort_breakdown?.find((item: any) => item.option_index === cohort.user_vote_index)?.percentage || 0}% of people in your demographic voted the same way.
            </p>
          </div>
        ) : null}

                {poll.faq && Array.isArray(poll.faq) && poll.faq.length > 0 ? (
          <div className="mx-4 my-8 animate-in fade-in duration-500">
            <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-maroon" />
              Topic Deep Dive
            </h3>
            <div className="space-y-3">
              {poll.faq.map((item: any, idx: number) => (
                <div key={idx} className="rounded-2xl border border-paper-border/80 bg-[#fdfbf7] p-4.5 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <h4 className="font-bold text-[#1f1b18] text-sm mb-2 leading-snug">{item.question || item.q}</h4>
                  <p className="text-sm text-[#6b665c] leading-relaxed">{item.answer || item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}