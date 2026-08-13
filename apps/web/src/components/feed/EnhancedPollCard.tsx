"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, MessageCircle, Share2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { ProgressiveGateModal } from "./ProgressiveGateModal";
import { ShareCardGenerator } from "./ShareCardGenerator";

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
  const rootRef = useRef<HTMLElement | null>(null);
  const [inViewHighlight, setInViewHighlight] = useState(false);
  const [pressedReaction, setPressedReaction] = useState<string | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [showVoteToast, setShowVoteToast] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(Date.now());
  const [showGate, setShowGate] = useState(false);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
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

  // highlight observer for visual "in-view" spotlight (60% threshold)
  useEffect(() => {
    if (!poll.id || typeof window === "undefined") return;
    const el = rootRef.current || document.getElementById(`poll-card-${poll.id}`);
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setInViewHighlight(Boolean(entry && entry.intersectionRatio >= 0.6));
      },
      { threshold: [0, 0.6, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [poll.id]);

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
    // Lock voting UI immediately so options are not shown again
    // prepare optimistic UI
    const prevResults = results.slice();
    const prevTotalVotes = totalVotes;
    const builtResults = poll.options.map((opt, i) => {
      const found = results.find((rr) => rr.index === i);
      return {
        option: opt,
        index: i,
        count: found ? found.count : 0,
        percentage: found ? found.percentage : 0,
      };
    });
    // increment optimistic count
    builtResults[index].count = (builtResults[index].count || 0) + 1;
    const optimisticTotal = (prevTotalVotes || 0) + 1;
    const optimisticResults = builtResults.map((r) => ({ ...r, percentage: Math.round(((r.count || 0) / optimisticTotal) * 100) }));
    setResults(optimisticResults);
    setTotalVotes(optimisticTotal);
    setAnimatedVotes(optimisticTotal);
    setUserVoteIndex(index);
    setHasVoted(true);
    // reveal bars quickly for animation
    window.setTimeout(() => setBarRevealReady(true), 30);
    try {
      if (!user) {
        const sessionId = typeof window !== "undefined" ? window.localStorage.getItem("pulse_guest_session") || `guest-${Date.now()}` : `guest-${Date.now()}`;
        if (typeof window !== "undefined") {
          window.localStorage.setItem("pulse_guest_session", sessionId);
        }
        await api.post(`/api/v1/votes/${poll.id}/guest-vote`, { session_id: sessionId, option_index: index });
        const pollRes = await api.get(`/api/v1/polls/${poll.id}`);
        setHasOpinion(false);
        setUserVoteIndex(pollRes.data.user_vote_index ?? index);
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
      setHasOpinion(false);
      setUserVoteIndex(pollRes.data.user_vote_index ?? index);
      setFeedback("✓ Your vote is recorded");
      setShowVoteToast(true);
      setShowSharePrompt(true);
      window.setTimeout(() => setShowVoteToast(false), 1400);
      onVoteComplete?.(index);
      setResults(pollRes.data.results || []);
      setTotalVotes(pollRes.data.total_votes || 0);
      setTotalOpinions(pollRes.data.total_opinions || 0);
      setLastUpdatedAt(Date.now());
      try {
        const gateRes = await api.get(`/api/v1/users/profile/gate/${poll.category}`);
        if (gateRes?.data?.required) {
          setShowGate(true);
          setGateMessage("We need one quick detail to keep your vote relevant.");
        }
      } catch (err) {
        // non-fatal: profile gate failure should not block vote flow
      }
    } catch (err: any) {
      // revert optimistic UI on error
      alert(err.response?.data?.message || "Failed to vote");
      setResults(prevResults);
      setTotalVotes(prevTotalVotes);
      setAnimatedVotes(prevTotalVotes);
      setUserVoteIndex(poll.user_vote_index ?? null);
      setHasVoted(Boolean(poll.has_voted));
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

  // close share menu when clicking outside
  useEffect(() => {
    if (!showShareMenu) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      const root = document.getElementById(`poll-card-${poll.id}`);
      if (!root) return;
      if (!target || !root.contains(target)) setShowShareMenu(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [showShareMenu, poll.id]);

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
  const isEndingSoon = endDate ? hoursToEnd !== null && hoursToEnd <= 24 && hoursToEnd > 0 : false;  return (
    <article
      ref={rootRef}
      id={`poll-card-${poll.id}`}
      className={`relative mb-6 overflow-hidden rounded-3xl border border-paper-border bg-transparent transition-all duration-400 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} ${inViewHighlight ? "ring-1 ring-maroon/20 bg-maroon/[0.01]" : "hover:border-ink/10 shadow-sm"}`}
    >
      {/* visual highlight overlay when card is in view */}
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${inViewHighlight ? "opacity-100" : "opacity-0"}`} style={{ mixBlendMode: 'multiply' }}>
        <div className="h-full w-full" style={{ background: inViewHighlight ? 'linear-gradient(90deg, rgba(250,222,120,0.0) 0%, rgba(250,222,120,0.08) 40%, rgba(250,222,120,0.0) 100%)' : 'transparent' }} />
      </div>

      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0 flex items-center gap-2 text-ink-muted">
          <div className="text-xs font-sans font-semibold uppercase tracking-wider">{poll.category.replace(/_/g, " ")}</div>
          <span className="opacity-40">•</span>
          <div className="text-xs font-sans font-medium">{relativeTime}</div>
        </div>
        <div>
          <button aria-label="menu" className="rounded-full p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink transition-colors duration-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
          </button>
        </div>
      </div>

      <div className="px-5 pb-4">
        <Link href={`/poll/${poll.id}`} className="block group">
          <h3 className="text-xl sm:text-2xl font-sans font-semibold tracking-tight leading-snug text-ink mb-2 line-clamp-4 group-hover:text-maroon transition-colors duration-200">{poll.question}</h3>
        </Link>
        <p className="text-sm text-ink-muted leading-relaxed">{socialLead}</p>
      </div>

      {!hasVoted ? (
        <div className="px-5 pb-5">
          {feedback ? (
            <div className="mb-4 rounded-xl border border-maroon/10 bg-maroon/5 px-4 py-3 text-sm font-medium text-maroon flex items-center gap-2 transition-all duration-300">
              <Sparkles className="h-4 w-4" /> {feedback}
            </div>
          ) : null}

          <div className="mt-2 flex w-full flex-col gap-2.5">
            {poll.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => void handleVote(idx)}
                disabled={isVoting}
                className={`group relative flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98] ${
                  selectedOptionIndex === idx 
                    ? 'border-ink bg-ink text-paper-bg shadow-sm' 
                    : 'border-paper-border bg-transparent text-ink hover:border-ink/30 hover:bg-ink/5'
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${selectedOptionIndex === idx ? 'border-paper-bg' : 'border-ink/30 group-hover:border-ink/50'}`}>
                  <span className={`inline-block h-2 w-2 rounded-full transition-transform duration-200 ${selectedOptionIndex === idx ? 'bg-paper-bg scale-100' : 'bg-transparent scale-0'}`} />
                </span>
                <span className="truncate">{option}</span>
              </button>
            ))}
          </div>

          {results.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-paper-border bg-transparent px-4 py-3 text-sm text-ink-muted text-center font-medium">Be the first to vote</div>
          ) : null}
        </div>
      ) : (
        <div className="px-5 pb-5">
          <div className="mt-2 flex w-full flex-col gap-2.5">
            {results.map((r, idx) => {
              const pct = Math.max(0, Math.min(100, r.percentage || 0));
              const isUserChoice = r.index === userVoteIndex;
              const displayLabel = r.option.length > 80 ? `${r.option.slice(0, 77)}…` : r.option;
              const fillWidth = `${pct}%`;
              const maxPct = Math.max(...(results || []).map((rr) => rr.percentage || 0));
              const isLeading = (r.percentage || 0) === maxPct && maxPct > 0;

              return (
                <div key={r.index} className="relative h-12 rounded-2xl overflow-hidden border border-paper-border/50 bg-paper-bg transition-all duration-300">
                  <div
                    className={`absolute left-0 top-0 h-full opacity-[0.15] transition-all duration-700 ease-out ${isLeading ? 'bg-maroon' : 'bg-ink'}`}
                    style={{ width: barRevealReady ? fillWidth : '0%' }}
                  />
                  
                  <div className="relative z-10 flex h-full items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${isUserChoice ? 'text-ink font-semibold' : 'text-ink'}`}>{displayLabel}</span>
                      {isUserChoice ? (
                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-ink text-paper-bg">
                          <CheckCircle2 className="h-3 w-3" />
                        </span>
                      ) : null}
                    </div>
                    <span className={`text-sm font-semibold text-ink`}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-paper-border/60 px-5 py-3 bg-transparent">
        <div className="flex items-center gap-4">
          <div className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            {totalVotes.toLocaleString()} votes
          </div>
          <div className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" />
            {opinionsTotal.toLocaleString()}
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowShareMenu((s) => !s)}
            aria-expanded={showShareMenu}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 transition-colors duration-200"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>

          {showShareMenu ? (
            <div className="absolute right-0 bottom-full mb-2 z-30 w-48 rounded-2xl border border-paper-border bg-paper-bg shadow-lg py-1.5 overflow-hidden transition-all duration-200">
              <button onClick={async () => { try { const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/poll/${poll.id}`; await navigator.clipboard.writeText(url); setShowSharePrompt(true); setTimeout(() => setShowSharePrompt(false), 2000); } catch {} }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5 transition-colors">Copy link</button>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(poll.question)}&url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/poll/${poll.id}`)}`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5 transition-colors">Twitter</a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/poll/${poll.id}`)}`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5 transition-colors">Facebook</a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/poll/${poll.id}`)}`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5 transition-colors">LinkedIn</a>
              <a href={`https://wa.me/?text=${encodeURIComponent(poll.question + ' ' + (typeof window !== 'undefined' ? window.location.origin + '/poll/' + poll.id : ''))}`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5 transition-colors">WhatsApp</a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/poll/${poll.id}`)}&text=${encodeURIComponent(poll.question)}`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5 transition-colors">Telegram</a>
            </div>
          ) : null}
          {showSharePrompt ? (
            <div className="absolute right-0 -top-10 rounded-xl bg-ink text-paper-bg px-3 py-1.5 text-xs font-medium whitespace-nowrap shadow-md">Copied!</div>
          ) : null}
        </div>
      </div>

      {hasVoted && (
      <div className="px-5 pb-2">
        <ShareCardGenerator
          title={poll.question}
          headline={(() => {
            const maxPct = Math.max(...results.map((rr) => rr.percentage || 0));
            const lead = results.find((r) => (r.percentage || 0) === maxPct);
            return lead ? `${lead.option} leads with ${lead.percentage}%` : "Latest poll result";
          })()}
          subtitle={`${totalVotes?.toLocaleString()} votes`}
          voteCount={totalVotes}
          resultData={results?.map((r) => ({ label: r.option, value: r.percentage }))}
          shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/poll/${poll.id}`}
        />
      </div>
      )}

      {/* Embedded Comments Section */}
      {hasVoted && (
      <div className="border-t border-paper-border/60 bg-transparent px-5 py-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold tracking-tight text-ink">Discussion</p>
          <span className="text-xs font-medium text-ink-muted">{opinionsTotal} comments</span>
        </div>

        {isLoadingOpinions ? (
          <p className="text-sm text-ink-muted animate-pulse">Loading comments…</p>
        ) : opinions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-paper-border bg-transparent px-4 py-3 text-sm text-ink-muted text-center font-medium">
             Be the first to share your thoughts.
          </div>
        ) : (
          <div className="space-y-3">
            {opinions.slice(0, 2).map((opinion) => {
              const city = extractCityFromHint(opinion.demographic_hint);
              const initials = getAvatarInitials(city || "Pulse");
              const isPressed = pressedReaction === `${opinion.id}:AGREE` || pressedReaction === `${opinion.id}:DISAGREE`;
              return (
                <div key={opinion.id} className="rounded-2xl border border-paper-border/50 bg-paper-bg p-3.5 transition-all hover:border-paper-border hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="relative mt-0.5 flex-shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-paper-bg shadow-sm">
                        {initials}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-ink">{city || "Pulse"}</p>
                        <span className="text-xs text-ink-muted">{formatRelativeTime(opinion.created_at)}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-ink/90">{opinion.content}</p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <button onClick={() => void handleReaction(opinion.id, "AGREE")} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${opinion.user_reaction === "AGREE" ? "bg-ink/10 text-ink" : "bg-transparent text-ink-muted hover:bg-ink/5"} ${isPressed ? "scale-95" : ""}`}>
                          <ThumbsUp className="h-3.5 w-3.5" /> {opinion.agree_count}
                        </button>
                        <button onClick={() => void handleReaction(opinion.id, "DISAGREE")} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${opinion.user_reaction === "DISAGREE" ? "bg-ink/10 text-ink" : "bg-transparent text-ink-muted hover:bg-ink/5"} ${isPressed ? "scale-95" : ""}`}>
                          <ThumbsDown className="h-3.5 w-3.5" /> {opinion.disagree_count}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4">
          {!user ? (
            <div className="rounded-2xl border border-paper-border bg-transparent p-4 text-sm transition-all">
              <p className="font-semibold text-ink">Join the conversation</p>
              <p className="mt-1 text-ink-muted mb-4">Sign in to share your view.</p>
              <div className="flex flex-wrap gap-2.5">
                <Link href={`/auth/login?mode=login&redirect=/poll/${poll.id}`} className="rounded-xl border border-paper-border bg-transparent px-4 py-2.5 text-sm font-medium text-ink hover:bg-ink/5 transition-all duration-200 ease-out active:scale-[0.98]">
                  Sign in
                </Link>
                <Link href={`/auth/login?mode=signup&redirect=/poll/${poll.id}`} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper-bg hover:bg-ink/90 transition-all duration-200 shadow-sm active:scale-[0.98]">
                  Create account
                </Link>
              </div>
            </div>
          ) : (
            <div className="relative flex gap-2 items-start">
              <textarea
                value={opinionText}
                onChange={(e) => setOpinionText(e.target.value)}
                placeholder="Share your view..."
                maxLength={280}
                rows={1}
                disabled={isPostingOpinion}
                className={`w-full resize-none rounded-2xl border border-paper-border bg-transparent px-4 py-3 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-all duration-200 focus:border-ink focus:ring-1 focus:ring-ink disabled:opacity-60 overflow-hidden min-h-[46px]`}
              />
              <button onClick={() => void handleOpinionSubmit()} disabled={!opinionText.trim() || isPostingOpinion} className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-paper-bg transition-all duration-200 hover:bg-ink/90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed shrink-0 h-[46px] shadow-sm flex items-center justify-center">
                Post
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      <ProgressiveGateModal
        isOpen={showGate}
        onClose={() => setShowGate(false)}
        onSelect={(value) => {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(`pulse-cohort:${poll.id}`, value);
          }
          setShowGate(false);
        }}
      />
    </article>
  );
}