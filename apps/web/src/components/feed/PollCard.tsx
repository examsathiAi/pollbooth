"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, Share2, Sparkles, ThumbsUp } from "lucide-react";
import { ProgressiveGateModal } from "./ProgressiveGateModal";
import { ShareCardGenerator } from "./ShareCardGenerator";

interface PollCardProps {
  poll: {
    id: string;
    question: string;
    options: string[];
    category: string;
    total_votes: number;
    total_opinions: number;
    has_voted?: boolean;
    results?: Array<{ option: string; index: number; count: number; percentage: number }>;
    user_vote_index?: number | null;
    is_commercial?: boolean;
  };
  onVoteComplete?: (index: number) => void;
}

export function PollCard({ poll, onVoteComplete }: PollCardProps) {
  const { user } = useAuth();
  const [hasVoted, setHasVoted] = useState(poll.has_voted || false);
  const [results, setResults] = useState(poll.results || []);
  const [userVoteIndex, setUserVoteIndex] = useState(poll.user_vote_index ?? null);
  const [isVoting, setIsVoting] = useState(false);
  const [showOpinions, setShowOpinions] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [discussionText, setDiscussionText] = useState("");
  const [discussionStatus, setDiscussionStatus] = useState<string | null>(null);
  const [cohort, setCohort] = useState("Mumbai");
  const [gateMessage, setGateMessage] = useState<string | null>(null);

  const voteLabel = useMemo(() => {
    if (userVoteIndex === null) return null;
    return userVoteIndex === 0 ? "Agree" : "Disagree";
  }, [userVoteIndex]);

  useEffect(() => {
    setHasVoted(Boolean(poll.has_voted));
  }, [poll.has_voted]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(`pollbooth-cohort:${poll.id}`);
      if (saved) {
        setCohort(saved);
      }
    }
  }, [poll.id]);

  const handleVote = async (index: number) => {
    if (!user) {
      window.location.href = `/auth/login?redirect=/poll/${poll.id}`;
      return;
    }
    setIsVoting(true);
    setGateMessage(null);
    try {
      await api.post(`/api/v1/votes/${poll.id}/vote`, { option_index: index });
      const [pollRes] = await Promise.all([
        api.get(`/api/v1/polls/${poll.id}`),
      ]);
      setHasVoted(true);
      setUserVoteIndex(index);
      setFeedback(index === 0 ? "Agree noted" : "Disagree noted");
      onVoteComplete?.(index);
      setResults(pollRes.data.results || []);
      const gateRes = await api.get(`/api/v1/users/profile/gate/${poll.category}`);
      if (gateRes.data.required) {
        setShowGate(true);
        setGateMessage("We need one quick profile detail to keep your vote relevant.");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to vote");
    } finally {
      setIsVoting(false);
    }
  };

  const handleDiscussionPost = async () => {
    if (!user) {
      window.location.href = `/auth/login?redirect=/poll/${poll.id}`;
      return;
    }
    if (!discussionText.trim()) return;
    try {
      await api.post(`/api/v1/opinions/${poll.id}/opinion`, { content: discussionText.trim() });
      setDiscussionText("");
      setDiscussionStatus("Your take is now live in the discussion.");
      setShowOpinions(true);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to post opinion");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "PollBooth Poll",
      text: `${poll.question} · Join the debate on PollBooth`,
      url: `${window.location.origin}/poll/${poll.id}?ref=${user?.id || "guest"}`,
    };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      alert("Link copied to clipboard!");
    }
  };

  const handleReferralShare = (platform: "whatsapp" | "telegram") => {
    const url = `${window.location.origin}/poll/${poll.id}?ref=${user?.id || "guest"}`;
    const text = encodeURIComponent(`${poll.question} · Join the conversation on PollBooth`);
    const encodedUrl = encodeURIComponent(url);
    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${text}%20${encodedUrl}`, "_blank", "noopener,noreferrer");
    } else {
      window.open(`https://t.me/share/url?url=${encodedUrl}&text=${text}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <article className="border-b border-slate-100 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-maroon/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-maroon">
          {poll.category.replace("_", " ")}
        </span>
        <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500">
          {poll.total_votes?.toLocaleString()} votes
        </span>
        <span className="rounded-full bg-[#f4efe7] px-2.5 py-1 text-[11px] font-medium text-[#1f1b18] border border-[#d8ceb8]">
          {cohort}
        </span>
        {poll.is_commercial && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
            Sponsored
          </span>
        )}
      </div>

      <h2 className="mb-3 text-[17px] font-semibold leading-6 text-slate-900">{poll.question}</h2>

      {feedback && !hasVoted && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <Sparkles className="h-4 w-4" /> {feedback}
        </div>
      )}
      {gateMessage && (
        <div className="mb-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-700">{gateMessage}</div>
      )}

      {!hasVoted ? (
        <div className="space-y-2">
          {poll.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={isVoting}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:border-maroon/30 hover:bg-maroon/5 active:scale-[0.99] disabled:opacity-60"
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
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
                <div className="mb-1 flex items-center justify-between text-sm gap-2">
                  <span className={isUserChoice ? "font-semibold text-maroon" : "text-slate-700"}>
                    {r.option} {isUserChoice ? "(You)" : ""}
                  </span>
                  <span className="font-semibold text-slate-700">{r.percentage}% • {r.count.toLocaleString()} votes</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out ${barClass} ${isUserChoice ? "shadow-[0_0_0_2px_rgba(37,99,235,0.12)]" : ""}`}
                    style={{ width: `${Math.max(r.percentage, 4)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
        <button onClick={handleShare} className="flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-maroon">
          <Share2 className="h-4 w-4" /> Share
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => handleReferralShare("whatsapp")} className="rounded-full px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-white">WA</button>
          <button onClick={() => handleReferralShare("telegram")} className="rounded-full px-2 py-1 text-xs font-semibold text-sky-700 transition hover:bg-white">TG</button>
        </div>
        <button onClick={() => setShowOpinions((value) => !value)} className="flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-maroon">
          <MessageCircle className="h-4 w-4" />
          {showOpinions ? "Hide" : "Open"} opinions
        </button>
      </div>

      {showOpinions && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-slate-800">Discussion</span>
            <span className="text-xs text-slate-400">Real voices, no replies</span>
          </div>
          <textarea
            value={discussionText}
            onChange={(event) => setDiscussionText(event.target.value)}
            rows={3}
            maxLength={280}
            placeholder="Share why you voted or what you think about this issue..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">{discussionText.length}/280</span>
            <button onClick={handleDiscussionPost} className="rounded-full bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">Post</button>
          </div>
          {discussionStatus ? <p className="mt-2 text-xs text-emerald-600">{discussionStatus}</p> : null}
        </div>
      )}

      {hasVoted && (
        <div className="mt-3">
          <ShareCardGenerator
            title={poll.question}
            headline={poll.results?.[0] ? `${poll.results[0].option} leads with ${poll.results[0].percentage}%` : "Latest poll result"}
            subtitle={`${poll.total_votes?.toLocaleString()} votes • ${cohort} cohort`}
            voteCount={poll.total_votes}
            resultData={poll.results?.map((result) => ({ label: result.option, value: result.percentage }))}
            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/poll/${poll.slug || poll.id}`}
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

      <ProgressiveGateModal
        isOpen={showGate}
        onClose={() => setShowGate(false)}
        onSelect={(value) => {
          setCohort(value);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(`pollbooth-cohort:${poll.id}`, value);
          }
        }}
      />
    </article>
  );
}
