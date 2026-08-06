"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, MessageCircle, Share2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";

interface EnhancedPollCardProps {
  poll: {
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
  };
  index?: number;
  isFeatured?: boolean;
  onVoteComplete?: (index: number) => void;
}

interface OpinionRecord {
  id: string;
  content: string;
  agree_count: number;
  disagree_count: number;
  created_at: string;
  demographic_hint?: string | null;
  user_reaction?: "AGREE" | "DISAGREE" | null;
}

function formatRelativeTime(input: string) {
  const diffMs = Date.now() - new Date(input).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getAvatarInitials(seed: string) {
  const cleanSeed = seed.trim().toUpperCase();
  if (!cleanSeed) return "PU";
  const parts = cleanSeed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

function extractCityFromHint(hint: string | null | undefined) {
  if (!hint) return null;
  const parts = hint
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const last = parts[parts.length - 1];
  const ageHints = ["GEN Z", "MILLENNIAL", "GEN X", "BOOMER", "GEN-Z", "GEN_X"];
  if (ageHints.includes(last.toUpperCase())) return null;
  return last;
}

export function EnhancedPollCard({ poll, index = 0, isFeatured = false, onVoteComplete }: EnhancedPollCardProps) {
  const { user } = useAuth();
  const [hasVoted, setHasVoted] = useState(Boolean(poll.has_voted));
  const [hasOpinion, setHasOpinion] = useState(Boolean(poll.has_opinion));
  const [results, setResults] = useState(poll.results || []);
  const [userVoteIndex, setUserVoteIndex] = useState(poll.user_vote_index ?? null);
  const [isVoting, setIsVoting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [totalVotes, setTotalVotes] = useState(poll.total_votes || 0);
  const [animatedVotes, setAnimatedVotes] = useState(poll.total_votes || 0);
  const [totalOpinions, setTotalOpinions] = useState(poll.total_opinions || 0);
  const [animatedOpinions, setAnimatedOpinions] = useState(poll.total_opinions || 0);
  const [opinionText, setOpinionText] = useState("");
  const [opinions, setOpinions] = useState<OpinionRecord[]>([]);
  const [opinionsTotal, setOpinionsTotal] = useState(poll.total_opinions || 0);
  const [isLoadingOpinions, setIsLoadingOpinions] = useState(false);
  const [showAllOpinions, setShowAllOpinions] = useState(false);
  const [isPostingOpinion, setIsPostingOpinion] = useState(false);
  const [opinionFeedback, setOpinionFeedback] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [pressedReaction, setPressedReaction] = useState<string | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [showVoteToast, setShowVoteToast] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(Date.now());
  const [liveTick, setLiveTick] = useState(Date.now());
  const [barRevealReady, setBarRevealReady] = useState(false);

  useEffect(() => {
    setHasVoted(Boolean(poll.has_voted));
    setHasOpinion(Boolean(poll.has_opinion));
    setResults(poll.results || []);
    setUserVoteIndex(poll.user_vote_index ?? null);
    setTotalVotes(poll.total_votes || 0);
    setTotalOpinions(poll.total_opinions || 0);
    setAnimatedVotes(poll.total_votes || 0);
    setAnimatedOpinions(poll.total_opinions || 0);
  }, [poll]);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), index * 90);
    return () => window.clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setLiveTick(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!hasVoted) {
      setBarRevealReady(false);
      return;
    }

    const timeoutId = window.setTimeout(() => setBarRevealReady(true), 60);
    return () => window.clearTimeout(timeoutId);
  }, [hasVoted, results]);

  useEffect(() => {
    if (!poll.id || typeof window === "undefined") return;

    const cardElement = document.getElementById(`poll-card-${poll.id}`);
    if (!cardElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        if (isVisible) {
          const timer = window.setTimeout(() => {
            void api.get(`/api/v1/polls/${poll.id}`).then((res) => {
              const nextResults = res.data.results || [];
              setResults(nextResults);
              setTotalVotes(res.data.total_votes ?? poll.total_votes);
              setTotalOpinions(res.data.total_opinions ?? poll.total_opinions);
              setLastUpdatedAt(Date.now());
            }).catch(() => undefined);
          }, 0);
          return () => window.clearTimeout(timer);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(cardElement);
    return () => observer.disconnect();
  }, [poll.id, poll.total_votes, poll.total_opinions]);

  useEffect(() => {
    if (!poll.id || typeof window === "undefined") return;

    const cardElement = document.getElementById(`poll-card-${poll.id}`);
    if (!cardElement) return;

    const intervalId = window.setInterval(() => {
      void api.get(`/api/v1/polls/${poll.id}`).then((res) => {
        const nextResults = res.data.results || [];
        setResults(nextResults);
        setTotalVotes(res.data.total_votes ?? poll.total_votes);
        setTotalOpinions(res.data.total_opinions ?? poll.total_opinions);
        setLastUpdatedAt(Date.now());
      }).catch(() => undefined);
    }, 25000);

    return () => window.clearInterval(intervalId);
  }, [poll.id, poll.total_votes, poll.total_opinions]);

  useEffect(() => {
    let frame = 0;
    const startValue = animatedVotes;
    const endValue = totalVotes;
    if (startValue === endValue) return;

    const startTime = performance.now();
    const duration = 650;
    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedVotes(Math.round(startValue + (endValue - startValue) * eased));
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [animatedVotes, totalVotes]);

  useEffect(() => {
    let frame = 0;
    const startValue = animatedOpinions;
    const endValue = totalOpinions;
    if (startValue === endValue) return;

    const startTime = performance.now();
    const duration = 650;
    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedOpinions(Math.round(startValue + (endValue - startValue) * eased));
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [animatedOpinions, totalOpinions]);

  useEffect(() => {
    const loadOpinions = async () => {
      setIsLoadingOpinions(true);
      try {
        const res = await api.get(`/api/v1/opinions/${poll.id}/opinions`, {
          params: { page: 1, limit: showAllOpinions ? 8 : 2, sort: "TOP" },
        });
        setOpinions(res.data.opinions || []);
        setOpinionsTotal(res.data.pagination?.total ?? poll.total_opinions ?? 0);
      } catch {
        setOpinions([]);
        setOpinionsTotal(poll.total_opinions || 0);
      } finally {
        setIsLoadingOpinions(false);
      }
    };

    void loadOpinions();
  }, [poll.id, poll.total_opinions, showAllOpinions]);

  const handleVote = async (index: number) => {
    setIsVoting(true);
    setFeedback(null);
    setSelectedOptionIndex(index);
    try {
      if (!user) {
        const sessionId = typeof window !== "undefined" ? window.localStorage.getItem("pulse_guest_session") || `guest-${Date.now()}` : `guest-${Date.now()}`;
        if (typeof window !== "undefined") {
          window.localStorage.setItem("pulse_guest_session", sessionId);
        }
        await api.post(`/api/v1/votes/${poll.id}/guest-vote`, { session_id: sessionId, option_index: index });
        const pollRes = await api.get(`/api/v1/polls/${poll.id}`);
        setHasVoted(true);
        setHasOpinion(false);
        setUserVoteIndex(index);
        setFeedback("✓ Your guest vote is recorded");
        setShowVoteToast(true);
        setShowSharePrompt(true);
        window.setTimeout(() => setShowVoteToast(false), 1400);
        onVoteComplete?.(index);
        setResults(pollRes.data.results || []);
        setTotalVotes(pollRes.data.total_votes || 0);
        setTotalOpinions(pollRes.data.total_opinions || 0);
        setLastUpdatedAt(Date.now());
        return;
      }

      await api.post(`/api/v1/votes/${poll.id}/vote`, { option_index: index });
      const pollRes = await api.get(`/api/v1/polls/${poll.id}`);
      setHasVoted(true);
      setHasOpinion(false);
      setUserVoteIndex(index);
      setFeedback("✓ Your vote is recorded");
      setShowVoteToast(true);
      setShowSharePrompt(true);
      window.setTimeout(() => setShowVoteToast(false), 1400);
      onVoteComplete?.(index);
      setResults(pollRes.data.results || []);
      setTotalVotes(pollRes.data.total_votes || 0);
      setTotalOpinions(pollRes.data.total_opinions || 0);
      setLastUpdatedAt(Date.now());
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to vote");
    } finally {
      setIsVoting(false);
    }
  };

  const handleOpinionSubmit = async () => {
    if (!user) {
      setOpinionFeedback("Sign up to share your opinion on this poll.");
      return;
    }
    if (!hasVoted) {
      setOpinionFeedback("Vote on this poll first to add your opinion.");
      return;
    }
    if (hasOpinion) {
      setOpinionFeedback("You already shared your view on this poll.");
      return;
    }
    if (!opinionText.trim() || opinionText.length > 280) return;

    setIsPostingOpinion(true);
    setOpinionFeedback(null);
    try {
      await api.post(`/api/v1/opinions/${poll.id}/opinion`, { content: opinionText.trim() });
      setOpinionText("");
      setOpinionFeedback("✓ Your opinion is now live on this poll.");
      setHasOpinion(true);
      setShowAllOpinions(true);
      setTotalOpinions((prev) => prev + 1);
      const res = await api.get(`/api/v1/opinions/${poll.id}/opinions`, { params: { page: 1, limit: 8, sort: "TOP" } });
      setOpinions(res.data.opinions || []);
      setOpinionsTotal(res.data.pagination?.total || 0);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to post opinion");
    } finally {
      setIsPostingOpinion(false);
    }
  };

  const handleReaction = async (opinionId: string, reactionType: "AGREE" | "DISAGREE") => {
    if (!user) {
      window.location.href = `/auth/login?redirect=/poll/${poll.id}`;
      return;
    }

    setPressedReaction(`${opinionId}:${reactionType}`);
    window.setTimeout(() => setPressedReaction(null), 220);

    try {
      await api.post(`/api/v1/opinions/${opinionId}/react`, { reaction_type: reactionType });
      setOpinions((current) =>
        current.map((op) => {
          if (op.id !== opinionId) return op;
          const previousReaction = op.user_reaction;
          let nextAgree = op.agree_count;
          let nextDisagree = op.disagree_count;
          let nextReaction: "AGREE" | "DISAGREE" | null = previousReaction ?? null;

          if (reactionType === "AGREE") {
            if (previousReaction === "AGREE") {
              nextAgree -= 1;
              nextReaction = null;
            } else if (previousReaction === "DISAGREE") {
              nextAgree += 1;
              nextDisagree -= 1;
              nextReaction = "AGREE";
            } else {
              nextAgree += 1;
              nextReaction = "AGREE";
            }
          } else if (reactionType === "DISAGREE") {
            if (previousReaction === "DISAGREE") {
              nextDisagree -= 1;
              nextReaction = null;
            } else if (previousReaction === "AGREE") {
              nextDisagree += 1;
              nextAgree -= 1;
              nextReaction = "DISAGREE";
            } else {
              nextDisagree += 1;
              nextReaction = "DISAGREE";
            }
          }

          return {
            ...op,
            agree_count: nextAgree,
            disagree_count: nextDisagree,
            user_reaction: nextReaction,
          };
        })
      );
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to react");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "Pulse Poll",
      text: `${poll.question} · See what India thinks on Pulse`,
      url: `${typeof window !== "undefined" ? window.location.origin : ""}/poll/${poll.id}?ref=${user?.id || "guest"}`,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      alert("Link copied to clipboard!");
    }
  };

  const headline = useMemo(() => {
    const winningResult = [...(results || [])].sort((a, b) => b.percentage - a.percentage)[0];
    const totalVotesForSignal = totalVotes || 0;
    if (!winningResult || totalVotesForSignal < 6) {
      return "Live pulse • What’s your take?";
    }
    return `Live pulse • ${winningResult.percentage}% say “${winningResult.option}”`; 
  }, [results, totalVotes]);

  const socialLead = useMemo(() => {
    const winningResult = [...(results || [])].sort((a, b) => b.percentage - a.percentage)[0];
    const totalVotesForSignal = totalVotes || 0;
    if (!winningResult || totalVotesForSignal < 6) {
      return "What’s your take on this one?";
    }
    return `${winningResult.percentage}% of people are leaning toward “${winningResult.option}” — vote now and join the conversation.`;
  }, [results, totalVotes]);

  const relativeTime = poll.created_at ? formatRelativeTime(poll.created_at) : "just now";
  const liveFreshness = useMemo(() => {
    const diffSeconds = Math.max(0, Math.floor((liveTick - lastUpdatedAt) / 1000));
    if (diffSeconds < 15) return "Updated just now";
    if (diffSeconds < 60) return `Updated ${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    return `Updated ${diffMinutes}m ago`;
  }, [lastUpdatedAt, liveTick]);
  const createdAt = poll.created_at ? new Date(poll.created_at) : null;
  const ageHours = createdAt ? (Date.now() - createdAt.getTime()) / 3600000 : 999;
  const isTrending = totalVotes >= 42 && ageHours <= 24;
  const endDate = poll.end_date ? new Date(poll.end_date) : null;
  const hoursToEnd = endDate ? (endDate.getTime() - Date.now()) / 3600000 : null;
  const isEndingSoon = endDate ? hoursToEnd !== null && hoursToEnd <= 24 && hoursToEnd > 0 : false;

  return (
    <article
      id={`poll-card-${poll.id}`}
      className={`overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-all duration-500 ${visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"} ${isFeatured ? "border-blue-200 shadow-[0_18px_45px_-25px_rgba(37,99,235,0.55)]" : "hover:shadow-md"} hover:-translate-y-0.5 hover:scale-[1.01] hover:border-blue-200 hover:shadow-[0_14px_34px_-18px_rgba(37,99,235,0.35)]`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="relative mt-0.5">
            <div className="avatar-live flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-semibold text-white shadow-sm">
              P
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">Pulse</p>
              <span className="text-xs text-slate-500">· {relativeTime}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{poll.category.replace(/_/g, " ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {liveFreshness}
          </span>
          {isTrending ? (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">
              🔥 Trending
            </span>
          ) : null}
          {isEndingSoon ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
              Ends soon
            </span>
          ) : null}
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">Live</span>
          <span className="text-[13px] font-semibold text-slate-600">{headline}</span>
        </div>
        <h3 className="text-[17px] font-semibold leading-6 text-slate-900">{poll.question}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{socialLead}</p>
      </div>

      {!hasVoted ? (
        <div className="space-y-3 px-4 py-3">
          {feedback ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <Sparkles className="h-4 w-4" /> {feedback}
            </div>
          ) : null}
          {showVoteToast ? (
            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
              <CheckCircle2 className="h-4 w-4" /> Voted! Results are updating.
            </div>
          ) : null}
          {poll.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => void handleVote(idx)}
              disabled={isVoting}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 active:scale-[0.98] disabled:opacity-60 ${selectedOptionIndex === idx && showVoteToast ? "border-blue-400 bg-blue-50 text-blue-700 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" : "border-slate-200 bg-slate-50 text-slate-800 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span>{option}</span>
                {selectedOptionIndex === idx && showVoteToast ? <CheckCircle2 className="h-4 w-4" /> : null}
              </span>
            </button>
          ))}

          {results.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live vote split</p>
                <p className="text-xs text-slate-500">{totalVotes.toLocaleString()} votes</p>
              </div>
              <div className="space-y-2.5">
                {results.map((r, idx) => {
                  const toneClasses = [
                    "from-blue-500 to-cyan-500",
                    "from-emerald-500 to-lime-500",
                    "from-amber-500 to-orange-500",
                    "from-violet-500 to-fuchsia-500",
                    "from-rose-500 to-pink-500",
                  ];
                  const barClass = toneClasses[idx % toneClasses.length];
                  return (
                    <div key={`${r.index}-${r.option}`}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">{r.option}</span>
                        <span>{r.percentage}% • {(r.count || 0).toLocaleString()} votes</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full bg-gradient-to-r ${barClass}`} style={{ width: `${Math.max(r.percentage, 2)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3 px-4 py-3">
          {showSharePrompt ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Your vote is in! Share this poll to see what your friends think.</p>
                  <p className="mt-1 text-xs text-blue-700">A quick share helps the conversation grow right away.</p>
                </div>
                <button onClick={() => setShowSharePrompt(false)} className="text-sm font-semibold text-blue-700">Dismiss</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void handleShare()} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">Share now</button>
                <button onClick={() => setShowSharePrompt(false)} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">Maybe later</button>
              </div>
            </div>
          ) : null}
          {results.map((r, idx) => {
            const isUserChoice = r.index === userVoteIndex;
            const toneClasses = [
              "from-blue-500 to-cyan-500",
              "from-emerald-500 to-lime-500",
              "from-amber-500 to-orange-500",
              "from-violet-500 to-fuchsia-500",
              "from-rose-500 to-pink-500",
            ];
            const barClass = toneClasses[idx % toneClasses.length];
            return (
              <div key={r.index}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold ${isUserChoice ? "text-blue-700" : "text-slate-800"}`}>
                    {r.option}
                    {isUserChoice ? <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] text-blue-700">Your vote</span> : null}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{r.percentage}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${barClass} ${isUserChoice ? "shadow-[0_0_0_2px_rgba(37,99,235,0.12)]" : ""}`}
                    style={{ width: `${barRevealReady ? Math.max(r.percentage, 4) : 0}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{(r.count || 0).toLocaleString()} votes</span>
                  <span>{r.percentage}% of responses</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
        <button className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-slate-900 active:scale-[0.98]">
          <CheckCircle2 className="h-4 w-4" />
          <span>{hasVoted ? "Voted" : "Vote"}</span>
        </button>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-slate-900 active:scale-[0.98]">
          <MessageCircle className="h-4 w-4" />
          <span>{animatedOpinions.toLocaleString()}</span>
        </button>
        <button onClick={() => void handleShare()} className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-slate-900 active:scale-[0.98]">
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>
      </div>

      <div className="border-t border-slate-100 bg-white px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Comments</p>
          <span className="text-xs text-slate-500">{opinionsTotal} total</span>
        </div>

        {isLoadingOpinions ? (
          <p className="text-sm text-slate-500">Loading comments…</p>
        ) : opinions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            {poll.total_opinions > 0 ? `There are ${poll.total_opinions} comment contributions on this poll, but the visible thread is currently empty.` : "No comments yet. Be the first to add one."}
          </div>
        ) : (
          <div className="space-y-3">
            {opinions.map((opinion) => {
              const city = extractCityFromHint(opinion.demographic_hint);
              const initials = getAvatarInitials(city || "Pulse");
              const isPressed = pressedReaction === `${opinion.id}:AGREE` || pressedReaction === `${opinion.id}:DISAGREE`;
              return (
                <div key={opinion.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="relative mt-0.5 flex-shrink-0">
                      <div className="avatar-live flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-[11px] font-semibold text-white">
                        {initials}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{city || "Pulse"}</p>
                        {city ? <span className="text-xs text-slate-500">{city}</span> : null}
                        <span className="text-xs text-slate-400">{formatRelativeTime(opinion.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-slate-700">{opinion.content}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void handleReaction(opinion.id, "AGREE")}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${opinion.user_reaction === "AGREE" ? "bg-blue-100 text-blue-700" : "bg-white text-slate-700"} ${isPressed ? "reaction-bounce" : ""}`}
                      >
                        <ThumbsUp className="h-3 w-3" /> {opinion.agree_count}
                      </button>
                      <button
                        onClick={() => void handleReaction(opinion.id, "DISAGREE")}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${opinion.user_reaction === "DISAGREE" ? "bg-rose-100 text-rose-700" : "bg-white text-slate-700"} ${isPressed ? "reaction-bounce" : ""}`}
                      >
                        <ThumbsDown className="h-3 w-3" /> {opinion.disagree_count}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {opinionsTotal > opinions.length ? (
          <button onClick={() => setShowAllOpinions((prev) => !prev)} className="mt-3 text-sm font-semibold text-blue-600">
            {showAllOpinions ? "Show fewer" : `View all ${opinionsTotal} comments`}
          </button>
        ) : null}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {hasOpinion ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              You&apos;ve shared your view on this poll.
            </div>
          ) : !user ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-700">
              <p className="font-semibold">You need an account to post a comment.</p>
              <p className="mt-1 text-blue-700/90">Comments are readable publicly, but posting is reserved for registered members.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/auth/login?mode=login&redirect=/poll/${poll.id}`} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-100">
                  Sign in
                </Link>
                <Link href={`/auth/login?mode=signup&redirect=/poll/${poll.id}`} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                  Create account
                </Link>
              </div>
            </div>
          ) : (
            <>
              <textarea
                value={opinionText}
                onChange={(e) => setOpinionText(e.target.value)}
                onFocus={() => setCommentFocused(true)}
                onBlur={() => setCommentFocused(false)}
                placeholder={hasVoted ? "Write your view on this poll..." : "Vote first to add your opinion"}
                maxLength={280}
                rows={3}
                disabled={!hasVoted || isPostingOpinion}
                className={`w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${commentFocused ? "translate-y-[-1px] border-blue-400 shadow-[0_0_0_4px_rgba(59,130,246,0.08)]" : ""}`}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs ${opinionText.length > 250 ? "font-semibold text-rose-500" : "text-slate-500"}`}>{opinionText.length}/280</span>
                <button onClick={() => void handleOpinionSubmit()} disabled={!opinionText.trim() || !hasVoted || isPostingOpinion} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                  {isPostingOpinion ? "Posting..." : "Post"}
                </button>
              </div>
            </>
          )}
          {opinionFeedback ? <p className="mt-2 text-xs text-emerald-600">{opinionFeedback}</p> : null}
        </div>
      </div>
    </article>
  );
}
