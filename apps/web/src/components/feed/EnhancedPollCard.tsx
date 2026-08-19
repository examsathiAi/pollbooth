"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, MessageCircle, Share2, Sparkles, ThumbsDown, ThumbsUp, Lock, CornerDownRight } from "lucide-react";
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
    whatsapp_share_text?: string | null;
    x_caption?: string | null;
    facebook_caption?: string | null;
    hashtags?: string[] | null;
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
  parent_id?: string | null;
}

const STRAWPOLL_COLORS = [
  "bg-emerald-500",
  "bg-orange-400",
  "bg-purple-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-amber-400"
];

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
  const parts = hint.split(/[;,]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const ageHints = ["GEN Z", "MILLENNIAL", "GEN X", "BOOMER", "GEN-Z", "GEN_X"];
  if (ageHints.includes(parts[parts.length - 1].toUpperCase())) return null;
  return parts[parts.length - 1];
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
  const [showComments, setShowComments] = useState(false);
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
  const [lastUpdatedAt, setLastUpdatedAt] = useState(Date.now());
  const [showGate, setShowGate] = useState(false);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [liveTick, setLiveTick] = useState(Date.now());
  const [barRevealReady, setBarRevealReady] = useState(false);

  // VIRAL LOOP STATES
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Enterprise SEO Slug Generator
  const seoSlug = useMemo(() => {
    if (poll.slug) return poll.slug;
    if (poll.hashtags && poll.hashtags.length > 0) {
      return poll.hashtags.map(t => t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()).filter(Boolean).join('-');
    }
    const stopWords = /\b(will|is|are|the|to|a|an|in|on|of|for|with|and|or|do|does|what|how|why|can)\b/gi;
    const clean = poll.question.replace(stopWords, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    return `${(poll.category || 'poll').toLowerCase().replace(/_/g, '-')}-${clean}`.slice(0, 75).replace(/-$/, '');
  }, [poll]);
  const pollUrl = `/poll/${seoSlug}--${poll.id}`;

  useEffect(() => {
    let initialHasVoted = Boolean(poll.has_voted);
    let initialVoteIndex = poll.user_vote_index ?? null;
    
    // Instantly sync with browser memory to prevent state desync and double-voting
    if (typeof window !== "undefined") {
      const localVote = window.localStorage.getItem('voted_' + poll.id);
      if (localVote !== null) {
        initialHasVoted = true;
        initialVoteIndex = Number(localVote);
      }
    }
    
    setHasVoted(initialHasVoted);
    setHasOpinion(Boolean(poll.has_opinion));
    setResults(poll.results || []);
    setUserVoteIndex(initialVoteIndex);
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
    if (user && poll.id) {
      api.get(`/api/v1/polls/${poll.id}/unlock-status`)
        .then(res => setIsUnlocked(res.data.unlocked))
        .catch(() => {});
    }
  }, [user, poll.id]);

  useEffect(() => {
    if (!showComments) return;
    const loadOpinions = async () => {
      setIsLoadingOpinions(true);
      try {
        const res = await api.get(`/api/v1/opinions/${poll.id}/opinions`, {
          params: { page: 1, limit: 15, sort: "TOP" },
        });
        setOpinions(res.data.opinions || []);
        setOpinionsTotal(res.data.pagination?.total ?? poll.total_opinions ?? 0);
      } catch {
        setOpinions([]);
      } finally {
        setIsLoadingOpinions(false);
      }
    };
    void loadOpinions();
  }, [poll.id, poll.total_opinions, showComments]);

  const handleReplyClick = async (opinionId: string) => {
    if (!user) {
      window.location.href = `/auth/login?mode=login&redirect=${pollUrl}`;
      return;
    }
    if (isUnlocked) {
      setActiveReplyId(activeReplyId === opinionId ? null : opinionId);
      return;
    }

    try {
      const shareData = {
        title: poll.question,
        text: "Join the debate on PollBooth!",
        url: `${window.location.origin}${pollUrl}?ref=${user.id}`,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        await api.post(`/api/v1/polls/${poll.id}/share`);
        setIsUnlocked(true);
        setActiveReplyId(opinionId);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert("Link copied! Share it with a friend to unlock all replies.");
        await api.post(`/api/v1/polls/${poll.id}/share`);
        setIsUnlocked(true);
        setActiveReplyId(opinionId);
      }
    } catch (err) {
      console.log("Share cancelled", err);
    }
  };

  const handleVote = async (index: number) => {
    setIsVoting(true);
    setFeedback(null);
    setSelectedOptionIndex(index);

    const prevResults = results.slice();
    const prevTotalVotes = totalVotes;

    const builtResults = poll.options.map((opt, i) => {
      const found = results.find((rr) => rr.index === i);
      return { option: opt, index: i, count: found ? found.count : 0, percentage: found ? found.percentage : 0 };
    });

    builtResults[index].count = (builtResults[index].count || 0) + 1;
    const optimisticTotal = (prevTotalVotes || 0) + 1;
    const optimisticResults = builtResults.map((r) => ({
      ...r,
      percentage: optimisticTotal > 0 ? Number(((r.count / optimisticTotal) * 100).toFixed(2)) : 0
    }));

    setResults(optimisticResults);
    setTotalVotes(optimisticTotal);
    setAnimatedVotes(optimisticTotal);
    setUserVoteIndex(index);
    setHasVoted(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem('voted_' + poll.id, index.toString());
    }
    window.setTimeout(() => setBarRevealReady(true), 30);

    try {
      if (!user) {
        const sessionId = typeof window !== "undefined" ? window.localStorage.getItem("pollbooth_guest_session") || `guest-${Date.now()}` : `guest-${Date.now()}`;
        if (typeof window !== "undefined") window.localStorage.setItem("pollbooth_guest_session", sessionId);
        await api.post(`/api/v1/votes/${poll.id}/guest-vote`, { session_id: sessionId, option_index: index });
      } else {
        await api.post(`/api/v1/votes/${poll.id}/vote`, { option_index: index });
      }

      const pollRes = await api.get(`/api/v1/polls/${poll.id}?t=${Date.now()}`);
      setHasOpinion(false);
      setUserVoteIndex(pollRes.data.user_vote_index ?? index);
      setFeedback("✓ Your vote is recorded");
      setShowVoteToast(true);
      setShowSharePrompt(true);
      window.setTimeout(() => setShowVoteToast(false), 1400);
      onVoteComplete?.(index);

      const serverTotal = pollRes.data.total_votes || 0;
      if (serverTotal >= optimisticTotal) {
        setResults(pollRes.data.results || []);
        setTotalVotes(serverTotal);
      }
      setTotalOpinions(pollRes.data.total_opinions || 0);
      setLastUpdatedAt(Date.now());

      try {
        if (user) {
          const gateRes = await api.get(`/api/v1/users/profile/gate/${poll.category}`);
          if (gateRes?.data?.required) {
            setShowGate(true);
            setGateMessage("We need one quick detail to keep your vote relevant.");
          }
        }
      } catch (err) {}
    } catch (err: any) {
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

  const handleOpinionSubmit = async (parentId?: string) => {
    if (!user) {
      setOpinionFeedback("Sign up to share your opinion on this poll.");
      return;
    }
    if (!hasVoted) {
      setOpinionFeedback("Vote on this poll first to add your opinion.");
      return;
    }
    if (!parentId && hasOpinion) {
      setOpinionFeedback("You already shared your view on this poll.");
      return;
    }
    
    const content = parentId ? replyText : opinionText;
    if (!content.trim() || content.length > 280) return;

    setIsPostingOpinion(true);
    setOpinionFeedback(null);
    try {
      await api.post(`/api/v1/opinions/${poll.id}/opinion`, { 
        content: content.trim(),
        parent_id: parentId || undefined
      });
      
      if (parentId) {
        setReplyText("");
        setActiveReplyId(null);
      } else {
        setOpinionText("");
        setOpinionFeedback("✓ Your opinion is now live.");
        setHasOpinion(true);
      }
      
      setShowComments(true);
      if (!parentId) setTotalOpinions((prev) => prev + 1);
      
      const res = await api.get(`/api/v1/opinions/${poll.id}/opinions`, { params: { page: 1, limit: 15, sort: "TOP" } });
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
      window.location.href = `/auth/login?mode=login&redirect=${pollUrl}`;
      return;
    }
    setPressedReaction(`${opinionId}:${reactionType}`);
    window.setTimeout(() => setPressedReaction(null), 220);
    try {
      await api.post(`/api/v1/opinions/${opinionId}/react`, { reaction_type: reactionType });
      setOpinions((current) => current.map((op) => {
        if (op.id !== opinionId) return op;
        const previousReaction = op.user_reaction;
        let nextAgree = op.agree_count;
        let nextDisagree = op.disagree_count;
        let nextReaction: "AGREE" | "DISAGREE" | null = previousReaction ?? null;
        if (reactionType === "AGREE") {
          if (previousReaction === "AGREE") { nextAgree -= 1; nextReaction = null; }
          else if (previousReaction === "DISAGREE") { nextAgree += 1; nextDisagree -= 1; nextReaction = "AGREE"; }
          else { nextAgree += 1; nextReaction = "AGREE"; }
        } else if (reactionType === "DISAGREE") {
          if (previousReaction === "DISAGREE") { nextDisagree -= 1; nextReaction = null; }
          else if (previousReaction === "AGREE") { nextDisagree += 1; nextAgree -= 1; nextReaction = "DISAGREE"; }
          else { nextDisagree += 1; nextReaction = "DISAGREE"; }
        }
        return { ...op, agree_count: nextAgree, disagree_count: nextDisagree, user_reaction: nextReaction };
      }));
    } catch (err: any) {}
  };

  const relativeTime = poll.created_at ? formatRelativeTime(poll.created_at) : "just now";

  return (
    <article
      ref={rootRef}
      id={`poll-card-${poll.id}`}
      className={`relative mb-6 overflow-hidden rounded-3xl border border-paper-border bg-transparent transition-all duration-400 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} hover:border-ink/10 shadow-sm`}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0 flex items-center gap-2 text-ink-muted">
          <div className="text-xs font-sans font-semibold uppercase tracking-wider">{poll.category.replace(/_/g, " ")}</div>
          <span className="opacity-40">•</span>
          <div className="text-xs font-sans font-medium">{relativeTime}</div>
        </div>
        
      </div>

      <div className="px-5 pb-4">
        <Link href={`${pollUrl}`} className="block group">
          <h3 className="text-xl sm:text-2xl font-sans font-semibold tracking-tight leading-snug text-ink mb-2 line-clamp-4 group-hover:text-maroon transition-colors duration-200">{poll.question}</h3>
        </Link>
      </div>
      

      {!hasVoted ? (
        <div className="px-5 pb-5">
          <div className="mt-3 flex w-full flex-col gap-3">
            {poll.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => void handleVote(idx)}
                disabled={isVoting}
                className={`group relative flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left text-sm font-semibold transition-all duration-300 ease-out transform hover:-translate-y-1 active:scale-95 cursor-pointer ${
                  selectedOptionIndex === idx || userVoteIndex === idx
                    ? 'border-maroon bg-maroon/5 text-maroon shadow-md ring-1 ring-maroon/20'
                    : 'border-paper-border/80 bg-transparent text-ink hover:border-ink/30 hover:bg-ink/5 hover:shadow-sm'
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300 ${selectedOptionIndex === idx || userVoteIndex === idx ? 'border-maroon' : 'border-ink/20 group-hover:border-maroon/50'}`}>
                  <span className={`inline-block h-2.5 w-2.5 rounded-full transition-transform duration-300 ${selectedOptionIndex === idx || userVoteIndex === idx ? 'bg-maroon scale-100' : 'bg-transparent scale-0'}`} />
                </span>
                <span className="truncate flex-1">{option}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-5 pb-5">
          <div className="mt-2 flex w-full flex-col">
            {results.map((r, idx) => {
              const pct = Math.max(0, Math.min(100, r.percentage || 0));
              const isUserChoice = r.index === userVoteIndex;
              const barColor = isUserChoice ? 'bg-maroon' : 'bg-[#10b981]';

              return (
                <div key={r.index} className="mb-4 last:mb-0">
                  <div className="flex justify-between items-end mb-1.5 px-1">
                    <span className={`text-sm font-medium flex items-center gap-2 ${isUserChoice ? 'text-ink font-bold' : 'text-ink/90'}`}>
                      {r.option}
                      {isUserChoice && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    </span>
                    <span className="text-xs text-ink-muted whitespace-nowrap ml-4">
                      {pct.toFixed(0)}% <span className="opacity-60">({r.count} votes)</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-paper-border/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
                      style={{ width: barRevealReady ? `${pct}%` : '0%' }}
                    />
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
            {animatedVotes.toLocaleString()} votes
          </div>
          <button onClick={() => setShowComments(!showComments)} className="text-xs font-medium text-ink-muted hover:text-ink flex items-center gap-1.5 transition-colors">
            <MessageCircle className="w-4 h-4" />
            {opinionsTotal.toLocaleString()} {opinionsTotal === 1 ? 'comment' : 'comments'}
          </button>
          <div className="relative flex items-center">
            <button onClick={() => setShowShareMenu(!showShareMenu)} className="text-xs font-medium text-ink-muted hover:text-ink flex items-center gap-1.5 transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            
          </div>
        </div>

      {/* Facebook-style Bottom Share Menu */}
      {showShareMenu && (
        <div className="px-5 pb-4 animate-in fade-in duration-300">
          <ShareCardGenerator
            title={poll.question}
            voteCount={animatedVotes}
            resultData={results.map((r) => ({ label: r.option, value: r.percentage || 0 }))}
            shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}${pollUrl}`}
            hashtags={poll.hashtags || []}
            captions={{
              whatsapp: poll.whatsapp_share_text || undefined,
              x: poll.x_caption || undefined,
              facebook: poll.facebook_caption || undefined,
              instagram: poll.instagram_caption || undefined
            }}
          />
        </div>
      )}
      </div>

      {hasVoted && showComments && (
      <div className="border-t border-paper-border/60 bg-transparent px-5 py-5 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold tracking-tight text-ink">Discussion</p>
        </div>

        {isLoadingOpinions ? (
          <p className="text-sm text-ink-muted animate-pollbooth">Loading comments…</p>
        ) : opinions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-paper-border bg-transparent px-4 py-3 text-sm text-ink-muted text-center font-medium">
             Be the first to share your thoughts.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Render Only Parent Opinions */}
            {opinions.filter(o => !o.parent_id).slice(0, 3).map((opinion) => {
              const city = extractCityFromHint(opinion.demographic_hint);
              const initials = getAvatarInitials(city || "PollBooth");
              const isPressed = pressedReaction === `${opinion.id}:AGREE` || pressedReaction === `${opinion.id}:DISAGREE`;
              
              return (
                <div key={opinion.id} className="rounded-2xl border border-paper-border/50 bg-paper-bg p-3.5 transition-all hover:border-paper-border hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="relative mt-0.5 flex-shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-paper-bg shadow-sm">{initials}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-ink">{city || "PollBooth"}</p>
                        <span className="text-xs text-ink-muted">{formatRelativeTime(opinion.created_at)}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-ink/90">{opinion.content}</p>
                      
                      {/* REACTIONS & VIRAL REPLY BUTTON */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <button onClick={() => void handleReaction(opinion.id, "AGREE")} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${opinion.user_reaction === "AGREE" ? "bg-ink/10 text-ink" : "bg-transparent text-ink-muted hover:bg-ink/5"} ${isPressed ? "scale-95" : ""}`}>
                          <ThumbsUp className="h-3.5 w-3.5" /> {opinion.agree_count}
                        </button>
                        <button onClick={() => void handleReaction(opinion.id, "DISAGREE")} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${opinion.user_reaction === "DISAGREE" ? "bg-ink/10 text-ink" : "bg-transparent text-ink-muted hover:bg-ink/5"} ${isPressed ? "scale-95" : ""}`}>
                          <ThumbsDown className="h-3.5 w-3.5" /> {opinion.disagree_count}
                        </button>
                        
                        <button onClick={() => void handleReplyClick(opinion.id)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-ink-muted hover:bg-ink/5 transition-all ml-auto">
                          {!isUnlocked ? <><Lock className="h-3.5 w-3.5" /> Unlock Reply</> : <><MessageCircle className="h-3.5 w-3.5" /> Reply</>}
                        </button>
                      </div>

                      {/* REPLY TEXT BOX (IF ACTIVE & UNLOCKED) */}
                      {activeReplyId === opinion.id && (
                         <div className="mt-3 border-l-2 border-paper-border/60 pl-3">
                           <div className="relative flex gap-2 items-start">
                             <textarea
                               value={replyText}
                               onChange={(e) => setReplyText(e.target.value)}
                               placeholder="Write a reply..."
                               maxLength={280}
                               rows={1}
                               disabled={isPostingOpinion}
                               className="w-full resize-none rounded-xl border border-paper-border bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-all focus:border-ink focus:ring-1 focus:ring-ink min-h-[38px]"
                             />
                             <button onClick={() => void handleOpinionSubmit(opinion.id)} disabled={!replyText.trim() || isPostingOpinion} className="rounded-xl bg-ink px-3 py-2 text-sm font-medium text-paper-bg transition-all hover:bg-ink/90 shrink-0">Post</button>
                           </div>
                         </div>
                      )}

                      {/* RENDER NESTED REPLIES */}
                      {opinions.filter(reply => reply.parent_id === opinion.id).map(reply => (
                         <div key={reply.id} className="mt-3 border-l-2 border-paper-border/60 pl-3 pt-1">
                           <div className="flex items-center gap-2 mb-1">
                             <CornerDownRight className="w-3 h-3 text-ink-muted" />
                             <p className="text-xs font-semibold text-ink">{extractCityFromHint(reply.demographic_hint) || "PollBooth"}</p>
                             <span className="text-[10px] text-ink-muted">{formatRelativeTime(reply.created_at)}</span>
                           </div>
                           <p className="text-sm text-ink/90">{reply.content}</p>
                         </div>
                      ))}
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
                <Link href={`/auth/login?mode=login&redirect=${pollUrl}`} className="rounded-xl border border-paper-border bg-transparent px-4 py-2.5 text-sm font-medium text-ink hover:bg-ink/5 transition-all duration-200">Sign in</Link>
                <Link href={`/auth/login?mode=login&redirect=${pollUrl}`} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper-bg hover:bg-ink/90 transition-all duration-200">Create account</Link>
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
              <button onClick={() => void handleOpinionSubmit()} disabled={!opinionText.trim() || isPostingOpinion} className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-paper-bg transition-all duration-200 hover:bg-ink/90 active:scale-[0.97] disabled:opacity-40 shrink-0 h-[46px]">Post</button>
            </div>
          )}
        </div>
      </div>
      )}

      <ProgressiveGateModal isOpen={showGate} onClose={() => setShowGate(false)} onSelect={(value) => { if (typeof window !== "undefined") window.localStorage.setItem(`pollbooth-cohort:${poll.id}`, value); setShowGate(false); }} />
    </article>
  );
}