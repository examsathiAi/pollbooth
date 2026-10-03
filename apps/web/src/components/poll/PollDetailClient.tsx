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
  isModalView?: boolean;
}

export function PollDetailClient({ pollId, initialPoll, isModalView }: PollDetailClientProps) {
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
  const [showInsights, setShowInsights] = useState(false);

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
      } else if (!poll?.slug) {
        setIsLoading(false);
      }
    };
    void load();
  }, [poll?.id, pollId, loadPoll]);

  // Canonical URL Enforcer: Silently rewrites naked UUID links to SEO keyword slugs instantly
  useEffect(() => {
    if (poll?.id && poll?.question && typeof window !== 'undefined') {
      let slug = poll.slug || "";
      if (!slug && poll.hashtags && poll.hashtags.length > 0) {
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

  
  if (isModalView) {
    return (
      <div className="flex flex-col gap-8 pb-4">
        <h2 className="text-2xl font-extrabold text-ink leading-tight">{poll.question}</h2>
        
        {poll.ai_summary && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b-2 border-paper-border/60 pb-2">
              <Sparkles className="w-5 h-5 text-maroon" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-ink">Context & Insights</h3>
            </div>
            <div className="text-[1.05rem] leading-relaxed text-ink/90 whitespace-pre-wrap font-sans">{poll.ai_summary}</div>
          </div>
        )}

        {poll.faq && poll.faq.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b-2 border-paper-border/60 pb-2">
              <svg className="w-5 h-5 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <h3 className="text-sm font-bold uppercase tracking-widest text-ink">Deep Dive / FAQ</h3>
            </div>
            <div className="flex flex-col gap-4">
              {poll.faq.map((item: any, idx: number) => (
                <div key={idx} className="rounded-2xl border border-paper-border/80 bg-[#fdfbf7] p-5 shadow-sm transition-colors hover:bg-white">
                  <h4 className="font-bold text-[#1f1b18] text-base mb-2 leading-snug">{item.question || item.q}</h4>
                  <p className="text-base text-[#6b665c] leading-relaxed">{item.answer || item.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!poll.ai_summary && (!poll.faq || poll.faq.length === 0) && (
          <div className="text-ink-muted italic">No insights available for this poll yet.</div>
        )}
      </div>
    );
  }

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
                <p className="text-sm text-emerald-700 mt-2 leading-relaxed">
                  Scroll down to keep voting on other polls in your feed!
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mx-4 mt-4 lg:mt-6 mb-8">
          <EnhancedPollCard poll={poll} onVoteComplete={handleVoteComplete} onShowInsights={(poll.ai_summary || (poll.faq && poll.faq.length > 0)) ? () => setShowInsights(true) : undefined} />
          
          {(poll.ai_summary || (poll.faq && poll.faq.length > 0)) && (
            <button 
              onClick={() => setShowInsights(true)} 
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-paper-card border border-maroon/20 px-4 py-3.5 text-sm font-bold text-maroon hover:bg-maroon/5 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4" /> Read Context & Deep Dive
            </button>
          )}
        </div>

        {related && related.length > 0 && (
          <div className="border-t border-paper-border/60 pt-8 bg-transparent">
            <div className="mx-4 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-maroon" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-ink">Keep Voting</h3>
            </div>
            <div className="mx-4 flex flex-col gap-6 pb-12">
              {related.map((rp, idx) => (
                <EnhancedPollCard key={rp.id} poll={rp} index={idx} />
              ))}
            </div>
          </div>
        )}

        {/* SEO Hidden Content - Always in DOM for Googlebot */}
        <div className="sr-only">
          <h2>{poll.question} - Context and Insights</h2>
          {poll.ai_summary && <p>{poll.ai_summary}</p>}
          {poll.faq && poll.faq.map((item: any, idx: number) => (
            <div key={idx}>
              <h3>{item.question || item.q}</h3>
              <p>{item.answer || item.a}</p>
            </div>
          ))}
        </div>

        {/* Insights Pop-up Modal */}
        {showInsights && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowInsights(false)}>
            <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl bg-paper-bg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowInsights(false)} className="absolute right-4 top-4 p-2 text-ink-muted hover:bg-paper-border/50 rounded-full transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
              
              <h2 className="text-xl font-bold text-ink mb-6 pr-8">{poll.question}</h2>
              
              {poll.ai_summary && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3 border-b border-paper-border/40 pb-2">
                    <Sparkles className="w-4 h-4 text-maroon" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-ink">Context & Insights</h3>
                  </div>
                  <div className="text-sm leading-relaxed text-ink/90 whitespace-pre-wrap font-sans">{poll.ai_summary}</div>
                </div>
              )}
              
              {poll.faq && poll.faq.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 border-b border-paper-border/40 pb-2">
                    <svg className="w-4 h-4 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-ink">Deep Dive / FAQ</h3>
                  </div>
                  <div className="space-y-3">
                    {poll.faq.map((item: any, idx: number) => (
                      <div key={idx} className="rounded-2xl border border-paper-border/80 bg-[#fdfbf7] p-3.5 shadow-sm">
                        <h4 className="font-bold text-[#1f1b18] text-sm mb-1.5 leading-snug">{item.question || item.q}</h4>
                        <p className="text-sm text-[#6b665c] leading-relaxed">{item.answer || item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
