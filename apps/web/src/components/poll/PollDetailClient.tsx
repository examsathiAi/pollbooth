"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Share2, Sparkles, ThumbsDown, ThumbsUp, Flag } from "lucide-react";
import { EnhancedPollCard } from "@/components/feed/EnhancedPollCard";

interface PollDetailClientProps {
  pollId: string;
  initialPoll: any | null;
}

export function PollDetailClient({ pollId, initialPoll }: PollDetailClientProps) {
  const actualPollId = useMemo(() => pollId.includes('--') ? (pollId.split('--').pop() as string) : pollId, [pollId]);
  const router = useRouter();
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
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
        api.get(`/api/v1/polls/${actualPollId}`),
        api.get(`/api/v1/opinions/${actualPollId}/opinions?sort=${sort}`),
        api.get(`/api/v1/feed/related/${actualPollId}?limit=4`).catch(() => ({ data: [] })),
      ]);
      setPoll(pollRes.data);
      setHasVoted(Boolean(pollRes.data.has_voted));
      setOpinions(opinionsRes.data.opinions || []);
      setRelated(relatedRes.data || []);
      setPrediction(pollRes.data.user_prediction ?? null);
      setPredictionInput(pollRes.data.user_prediction?.toString() || "");
      if (pollRes.data.has_voted) {
        try {
          const cohortRes = await api.get(`/api/v1/votes/${actualPollId}/cohort`);
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

  // Canonical URL Enforcer: Silently rewrites naked UUID links to SEO keyword slugs instantly
  useEffect(() => {
    if (poll?.id && poll?.question && typeof window !== 'undefined') {
      let slug = "";
      if (poll.hashtags && poll.hashtags.length > 0) {
        slug = poll.hashtags.map((t: string) => t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()).filter(Boolean).join('-');
      } else {
        const stopWords = /\b(will|is|are|the|to|a|an|in|on|of|for|with|and|or|do|does|what|how|why|can)\b/gi;
        const clean = poll.question.replace(stopWords, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        slug = `${(poll.category || 'poll').toLowerCase().replace(/_/g, '-')}-${clean}`.slice(0, 75).replace(/-$/, '');
      }
      const targetPath = `/poll/${slug}--${poll.id}`;
      
      // If the URL in the browser doesn't match the optimized SEO target, rewrite it cleanly
      if (window.location.pathname !== targetPath && !window.location.pathname.includes(slug)) {
        window.history.replaceState({ ...window.history.state, as: targetPath, url: targetPath }, '', targetPath);
      }
    }
  }, [poll?.id, poll?.question, poll?.category, poll?.hashtags]);


  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(`pollbooth-cohort:${actualPollId}`);
      if (saved) {
        setCohort(saved);
      }
    }
  }, [pollId]);

  
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown === 0) {
      router.push('/feed');
      return;
    }
    const timer = window.setTimeout(() => setRedirectCountdown(prev => (prev as number) - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [redirectCountdown, router]);

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
      await api.post(`/api/v1/polls/${actualPollId}/predict`, { predicted_percentage: value });
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
    setRedirectCountdown(15);
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
      await api.post(`/api/v1/opinions/${actualPollId}/opinion`, { content: newOpinion.trim() });
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
        <div className="w-full bg-transparent transition-colors duration-300 pb-12">
      

            <main>
      {redirectCountdown !== null && (
        <div className="mx-4 mt-5 flex flex-col gap-3 rounded-3xl border border-emerald-200 bg-[#f0fdf4] p-5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-emerald-950 tracking-tight">Thank you for voting!</h4>
              <p className="text-sm font-semibold text-emerald-800 mt-0.5">Your vote has been registered.</p>
              <p className="text-sm text-emerald-700 mt-2 leading-relaxed">
                You can express your views from the comments section below. If you choose not to, you will be led to other polls in <span className="font-bold px-1.5 py-0.5 bg-emerald-200/50 rounded text-emerald-900">{redirectCountdown}s</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-2 border-t border-emerald-200/60 pt-4">
            <button
              onClick={() => setRedirectCountdown(null)}
              className="rounded-xl bg-emerald-200/50 px-4 py-2.5 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-300 active:scale-95"
            >
              Wait, stay here
            </button>
            <button
              onClick={() => {
                setRedirectCountdown(null);
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-sm"
            >
              Express my views
            </button>
          </div>
        </div>
      )}
      
        

        <EnhancedPollCard poll={poll} onVoteComplete={handleVoteComplete} />

        {/* AI Context & Summary moved below the main poll */}
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
          <div className="mx-4 my-6 overflow-hidden rounded-3xl border border-paper-border/60 bg-transparent p-5 shadow-sm transition-all animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-4 border-b border-paper-border/40 pb-3">
              <Sparkles className="w-5 h-5 text-maroon" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-ink">Topic Deep Dive</h3>
            </div>
            <div className="space-y-4">
              {poll.faq.map((item: any, idx: number) => (
                <div key={idx} className="rounded-2xl border border-paper-border/80 bg-[#fdfbf7] p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
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