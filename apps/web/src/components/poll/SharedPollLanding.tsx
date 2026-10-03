"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, Loader2, X } from "lucide-react";
import { EnhancedPollCard } from "@/components/feed/EnhancedPollCard";
import { api } from "@/lib/api";

type AnyPoll = Record<string, any>;

function normalize(p: AnyPoll): AnyPoll {
  const fromResults = Array.isArray(p.results) ? p.results.map((r: any) => r.option) : [];
  return {
    ...p,
    options: Array.isArray(p.options) && p.options.length > 0 ? p.options : fromResults,
    total_votes: p.total_votes ?? 0,
    total_opinions: p.total_opinions ?? 0,
  };
}

async function hydrate(base: AnyPoll): Promise<AnyPoll> {
  try {
    const res = await api.get(`/api/v1/polls/${base.id}`);
    const d = res.data || {};
    return {
      ...d,
      ...base,
      has_voted: d.has_voted ?? false,
      has_opinion: d.has_opinion ?? false,
      user_vote_index: d.user_vote_index ?? null,
      user_opinion: d.user_opinion ?? null,
      results: d.results || [],
      total_votes: d.total_votes ?? base.total_votes ?? 0,
      total_opinions: d.total_opinions ?? base.total_opinions ?? 0,
      end_date: d.end_date ?? base.end_date ?? null,
      image_url: base.image_url ?? d.image_url ?? null,
    };
  } catch {
    return base;
  }
}

export function SharedPollLanding({ poll, insights }: { poll: AnyPoll; insights: ReactNode }) {
  const [mainPoll, setMainPoll] = useState<AnyPoll>(() => normalize(poll));
  const [others, setOthers] = useState<AnyPoll[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("insights=true")) {
      setTimeout(() => setShowInsights(true), 50);
      const url = new URL(window.location.href);
      url.searchParams.delete("insights");
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  const [voted, setVoted] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const seen = useRef<Set<string>>(new Set([poll.id]));

  useEffect(() => {
    if (justVoted && moreRef.current) {
      const timer = setTimeout(() => {
        moreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setJustVoted(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [justVoted]);


  useEffect(() => {
    let alive = true;
    hydrate(poll).then((h) => {
      if (!alive) return;
      const n = normalize(h);
      setMainPoll(n);
      const local = typeof window !== "undefined" && window.localStorage.getItem("voted_" + poll.id) !== null;
      if (n.has_voted || local) setVoted(true);
    });
    return () => {
      alive = false;
    };
  }, [poll]);

  const loadOthers = useCallback(async (nextPage: number) => {
    setLoadingMore(true);
    try {
      const guest = typeof window !== "undefined" ? window.localStorage.getItem("pollbooth_guest_session") || undefined : undefined;
      const headers: Record<string, string> = {};
      if (guest) headers["x-pollbooth-guest-session"] = guest;
      const res = await api.get("/api/v1/polls/feed", { params: { page: nextPage, limit: 6 }, headers });
      const base = ((res.data.polls || []) as AnyPoll[]).filter((p) => !seen.current.has(p.id));
      base.forEach((p) => seen.current.add(p.id));
      const hydrated = await Promise.all(base.map(hydrate));
      setOthers((cur) => [...cur, ...hydrated.map(normalize)]);
      setHasMore(nextPage < (res.data.pagination?.total_pages || 1));
      setPage(nextPage);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadOthers(1);
  }, [loadOthers]);

  useEffect(() => {
    if (!showInsights) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowInsights(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [showInsights]);

  return (
    <div className="mx-auto w-full max-w-2xl pb-16">
      {Array.isArray(mainPoll.options) && mainPoll.options.length > 0 && (
        <EnhancedPollCard poll={mainPoll as any} index={0} onVoteComplete={() => { setVoted(true); setJustVoted(true); }} onShowInsights={() => setShowInsights(true)} />
      )}

      

      <div ref={moreRef} className="scroll-mt-24">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">Aur polls mein vote karo</h2>
        <div className="space-y-4">
          {others.map((p, i) => (
            <EnhancedPollCard key={p.id} poll={p as any} index={i} />
          ))}
        </div>
        {loadingMore && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-maroon" />
          </div>
        )}
        {!loadingMore && hasMore && others.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => void loadOthers(page + 1)}
              className="rounded-2xl border border-paper-border/60 px-6 py-2 text-sm font-medium text-ink transition-all hover:bg-ink/5"
            >
              Load more
            </button>
          </div>
        )}
        <div className="mt-8 text-center">
          <Link href="/feed" className="text-sm font-semibold text-maroon hover:underline">
            Poora feed dekho
          </Link>
        </div>
      </div>

      {showInsights && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInsights(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Poll insights"
            className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-paper-bg p-5 shadow-2xl sm:rounded-3xl sm:p-8"
          >
            <button
              onClick={() => setShowInsights(false)}
              aria-label="Close insights"
              className="sticky top-0 z-10 float-right rounded-full bg-paper-bg p-2 text-ink-muted hover:bg-ink/5 hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
            {insights}
          </div>
        </div>
      )}
    </div>
  );
}
