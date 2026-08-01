"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, Sparkles } from "lucide-react";

export default function GuestPollPage() {
  const params = useParams();
  const router = useRouter();
  const guestPollId = params?.guestPollId as string;
  const [poll, setPoll] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/api/v1/polls/${guestPollId}`);
        setPoll(res.data);
      } catch {
        setMessage("This shared poll could not be loaded right now.");
      } finally {
        setIsLoading(false);
      }
    };

    if (guestPollId) {
      load();
    }
  }, [guestPollId]);

  const handleVote = async () => {
    if (selectedOption === null) return;
    setIsSubmitting(true);
    try {
      const sessionId = typeof window !== "undefined" ? window.localStorage.getItem("pulse_guest_session") || `guest-${Date.now()}` : `guest-${Date.now()}`;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("pulse_guest_session", sessionId);
      }
      await api.post(`/api/v1/votes/${guestPollId}/guest-vote`, {
        session_id: sessionId,
        option_index: selectedOption,
      });
      setMessage("Thanks for joining the conversation. Sign in to keep your voice and unlock rewards.");
      setTimeout(() => router.push(`/poll/${guestPollId}`), 1200);
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Guest vote failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareHint = useMemo(() => {
    return `Tap the link to vote on ${poll?.question?.slice(0, 70) || "this pulse poll"}`;
  }, [poll]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-white px-4 py-6">
      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
          <Sparkles className="h-4 w-4" /> Guest poll invite
        </div>
        <h1 className="mt-3 text-xl font-semibold text-slate-900">{poll?.question || "Shared Pulse poll"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{shareHint}</p>
      </div>

      <div className="mt-4 space-y-2">
        {poll?.options?.map((option: string, idx: number) => (
          <button
            key={idx}
            onClick={() => setSelectedOption(idx)}
            className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${selectedOption === idx ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"}`}
          >
            {option}
          </button>
        ))}
      </div>

      <button
        onClick={handleVote}
        disabled={selectedOption === null || isSubmitting}
        className="mt-5 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "Submitting..." : "Vote as guest"}
      </button>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
