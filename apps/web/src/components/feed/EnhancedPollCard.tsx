"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const rootRef = useRef<HTMLElement | null>(null);
  const [inViewHighlight, setInViewHighlight] = useState(false);
  const [pressedReaction, setPressedReaction] = useState<string | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [showVoteToast, setShowVoteToast] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
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
  const isEndingSoon = endDate ? hoursToEnd !== null && hoursToEnd <= 24 && hoursToEnd > 0 : false;

  return (
    <article
      ref={rootRef}
      id={`poll-card-${poll.id}`}
      className={`overflow-hidden relative rounded-sm border border-paper-border bg-paper-card transition-all duration-200 ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${inViewHighlight ? "border-l-4 border-maroon" : ""}`}
    >
      {/* visual highlight overlay when card is in view */}
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${inViewHighlight ? "opacity-100" : "opacity-0"}`} style={{ mixBlendMode: 'multiply' }}>
        <div className="h-full w-full" style={{ background: inViewHighlight ? 'linear-gradient(90deg, rgba(250,222,120,0.0) 0%, rgba(250,222,120,0.18) 40%, rgba(250,222,120,0.0) 100%)' : 'transparent' }} />
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-paper-card border-b border-paper-border">
        <div className="min-w-0">
          <div className="text-xs font-sans uppercase tracking-widest text-ink-muted">{poll.category.replace(/_/g, " ")} · {relativeTime}</div>
        </div>
        <div>
          <button aria-label="menu" className="rounded-sm p-2 text-ink hover:bg-paper-card">⋯</button>
        </div>
      </div>

      <div className="px-4 py-4">
        <h3 className="text-2xl font-headline leading-snug text-ink line-clamp-4">{poll.question}</h3>
        <p className="mt-2 text-sm text-ink-muted">{socialLead}</p>
      </div>

      {!hasVoted ? (
        <div className="px-4 pb-4">
          {feedback ? (
            <div className="mb-3 rounded-sm border border-maroon/10 bg-paper-card px-3 py-2 text-sm text-maroon flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> {feedback}
            </div>
          ) : null}

          <div className="mt-3 flex w-full flex-col gap-2">
            {poll.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => void handleVote(idx)}
                disabled={isVoting}
                className={`group flex w-full items-center gap-3 rounded-sm border border-paper-border bg-paper-card px-4 py-3 text-left text-sm font-medium text-ink hover:bg-paper-border active:scale-[0.98] transition`}
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  <span className={`inline-block h-3 w-3 ${selectedOptionIndex === idx ? 'bg-maroon border-maroon' : 'border-ink-muted'} transition-colors`} />
                </span>
                <span className="truncate">{option}</span>
              </button>
            ))}
          </div>

          {results.length === 0 ? (
            <div className="mt-3 rounded-sm border border-dashed border-paper-border bg-paper-card px-4 py-3 text-sm text-ink-muted">Be the first to vote</div>
          ) : null}
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="mt-3 flex w-full flex-col gap-2">
            {results.map((r, idx) => {
              const pct = Math.max(0, Math.min(100, r.percentage || 0));
              const isUserChoice = r.index === userVoteIndex;
              const displayLabel = r.option.length > 80 ? `${r.option.slice(0, 77)}…` : r.option;
              const fillWidth = `${pct}%`;
              const maxPct = Math.max(...(results || []).map((rr) => rr.percentage || 0));
              const isLeading = (r.percentage || 0) === maxPct;

              return (
                <div key={r.index} className="relative h-12 rounded-sm overflow-hidden">
                  <div className="absolute inset-0 bg-paper-border" />
                  <div
                    className={`absolute left-0 top-0 h-full ${isLeading ? 'bg-maroon' : 'bg-paper-border'} opacity-90 transition-all duration-700 ease-out`}
                    style={{ width: barRevealReady ? fillWidth : '0%' }}
                  />

                  <div className="relative z-10 flex h-full items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${isLeading ? 'text-white' : 'text-ink'}`}>{displayLabel}</span>
                      {isUserChoice ? (
                        <span className={`rounded-sm px-1 text-xs font-bold ${isLeading ? 'bg-white/20 text-white' : 'bg-maroon-dark text-white'}`}>✓</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isLeading ? 'text-white' : 'text-ink'}`}>{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-paper-border px-4 py-3 bg-paper-card">
        <div className="text-xs text-ink-muted">{totalVotes.toLocaleString()} votes</div>
        <div>
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu((s) => !s)}
                  aria-expanded={showShareMenu}
                  className="inline-flex items-center gap-2 rounded-sm px-3 py-1 text-xs font-semibold text-ink bg-paper-card hover:bg-paper-border"
                >
                  <Share2 className="h-4 w-4" /> Share
                </button>

                {showShareMenu ? (
                  <div className="absolute right-0 z-30 mt-2 w-44 rounded-sm border border-paper-border bg-paper-card shadow-sm py-2">
                    <button onClick={async () => { try { const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/poll/${poll.id}`; await navigator.clipboard.writeText(url); setShowSharePrompt(true); setTimeout(() => setShowSharePrompt(false), 2000); } catch {} }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-paper-border">Copy link</button>
                    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(poll.question)}&url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/poll/${poll.id}`)}`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-paper-border">Twitter</a>
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/poll/${poll.id}`)}`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-paper-border">Facebook</a>
                    <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/poll/${poll.id}`)}`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-paper-border">LinkedIn</a>
                    <a href={`https://wa.me/?text=${encodeURIComponent(poll.question + ' ' + (typeof window !== 'undefined' ? window.location.origin + '/poll/' + poll.id : ''))}`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-paper-border">WhatsApp</a>
                    <a href={`https://t.me/share/url?url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/poll/${poll.id}`)}&text=${encodeURIComponent(poll.question)}`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-paper-border">Telegram</a>
                  </div>
                ) : null}
                {showSharePrompt ? (
                  <div className="absolute right-0 -top-9 rounded-sm bg-maroon-dark text-white px-2 py-1 text-xs whitespace-nowrap">Copied!</div>
                ) : null}
              </div>
        </div>
      </div>

      <div className="border-t border-paper-border bg-paper-card px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Comments</p>
          <span className="text-xs text-ink-muted">{opinionsTotal} total</span>
        </div>

        {isLoadingOpinions ? (
          <p className="text-sm text-ink-muted">Loading comments…</p>
        ) : opinions.length === 0 ? (
          <div className="rounded-sm border border-paper-border bg-paper-card px-3 py-2 text-sm text-ink-muted">
            {poll.total_opinions > 0 ? `There are ${poll.total_opinions} comment contributions on this poll, but the visible thread is currently empty.` : "No comments yet. Be the first to add one."}
          </div>
        ) : (
          <div className="space-y-3">
            {opinions.map((opinion) => {
              const city = extractCityFromHint(opinion.demographic_hint);
              const initials = getAvatarInitials(city || "Pulse");
              const isPressed = pressedReaction === `${opinion.id}:AGREE` || pressedReaction === `${opinion.id}:DISAGREE`;
              return (
                <div key={opinion.id} className="rounded-sm border border-paper-border bg-paper-card p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="relative mt-0.5 flex-shrink-0">
                      <div className="avatar-live flex h-8 w-8 items-center justify-center rounded-full bg-maroon text-[11px] font-semibold text-white">
                        {initials}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{city || "Pulse"}</p>
                        {city ? <span className="text-xs text-ink-muted">{city}</span> : null}
                        <span className="text-xs text-ink-muted">{formatRelativeTime(opinion.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-ink">{opinion.content}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void handleReaction(opinion.id, "AGREE")}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${opinion.user_reaction === "AGREE" ? "bg-paper-card border-maroon text-maroon" : "bg-paper-card text-ink-muted"} ${isPressed ? "reaction-bounce" : ""}`}
                      >
                        <ThumbsUp className="h-3 w-3" /> {opinion.agree_count}
                      </button>
                      <button
                        onClick={() => void handleReaction(opinion.id, "DISAGREE")}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${opinion.user_reaction === "DISAGREE" ? "bg-paper-card border-maroon text-maroon" : "bg-paper-card text-ink-muted"} ${isPressed ? "reaction-bounce" : ""}`}
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
          <button onClick={() => setShowAllOpinions((prev) => !prev)} className="mt-3 text-sm font-semibold text-ink">{
            showAllOpinions ? "Show fewer" : `View all ${opinionsTotal} comments`
          }</button>
        ) : null}

        <div className="mt-4 rounded-sm border border-paper-border bg-paper-card p-3">
          {hasOpinion ? (
            <div className="rounded-sm border border-paper-border bg-paper-card px-3 py-2 text-sm text-ink">
              You&apos;ve shared your view on this poll.
            </div>
          ) : !user ? (
            <div className="rounded-sm border border-paper-border bg-paper-card px-3 py-3 text-sm text-ink">
              <p className="font-semibold">You need an account to post a comment.</p>
              <p className="mt-1 text-ink-muted">Comments are readable publicly, but posting is reserved for registered members.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/auth/login?mode=login&redirect=/poll/${poll.id}`} className="rounded-sm border border-maroon bg-paper-card px-3 py-2 text-sm font-semibold text-maroon transition hover:bg-paper-border">
                  Sign in
                </Link>
                <Link href={`/auth/login?mode=signup&redirect=/poll/${poll.id}`} className="rounded-sm bg-maroon px-3 py-2 text-sm font-semibold text-white transition hover:bg-maroon-dark">
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
                className={`w-full resize-none rounded-sm border border-paper-border bg-paper-card px-3 py-2 text-sm text-ink outline-none transition-all duration-200 focus:border-maroon focus:ring-2 focus:ring-maroon/20 disabled:cursor-not-allowed disabled:opacity-60 ${commentFocused ? "translate-y-[-1px] border-maroon shadow-[0_0_0_4px_rgba(128,0,0,0.08)]" : ""}`}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs ${opinionText.length > 250 ? "font-semibold text-rose-500" : "text-slate-500"}`}>{opinionText.length}/280</span>
                <button onClick={() => void handleOpinionSubmit()} disabled={!opinionText.trim() || !hasVoted || isPostingOpinion} className="rounded-sm bg-maroon px-4 py-2 text-sm font-semibold text-white transition hover:bg-maroon-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
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
