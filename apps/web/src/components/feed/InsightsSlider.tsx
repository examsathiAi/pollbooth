"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Sparkles, Users, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

interface InsightItem {
  id: string;
  headline: string;
  created_at: string;
  poll: {
    id: string;
    question: string;
    category: string;
    total_votes: number;
  };
  demographics_summary?: {
    dominant_age_group?: string;
  };
}

const CARD_STEP = 296; // card width 280 + gap 16
const AUTO_MS = 4500;

export function InsightsSlider() {
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await api.get("/api/v1/feed/insights?limit=6");
        setInsights(res.data || []);
      } catch {
        setInsights([]);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchInsights();
  }, []);

  const slide = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else if (dir === -1 && el.scrollLeft <= 4) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    else el.scrollBy({ left: dir * CARD_STEP, behavior: "smooth" });
  }, []);

  // Gentle auto-scroll; pauses while the visitor is touching or hovering.
  useEffect(() => {
    if (insights.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (!pausedRef.current) slide(1);
    }, AUTO_MS);
    return () => clearInterval(timer);
  }, [insights.length, slide]);

  if (isLoading) {
    return (
      <div className="mb-6 rounded-2xl border border-paper-border/30 bg-paper-bg p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-maroon animate-pollbooth" />
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">Loading Intelligence Briefs…</h3>
        </div>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-maroon" />
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-ink">PollBooth Intelligence & Exit Polls</h3>
      </div>

      <div
        className="relative"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
        onTouchStart={() => { pausedRef.current = true; }}
        onTouchEnd={() => { setTimeout(() => { pausedRef.current = false; }, 6000); }}
      >
        <button
          type="button"
          aria-label="Previous report"
          onClick={() => slide(-1)}
          className="absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-paper-border/60 bg-paper-bg text-ink shadow-md transition hover:bg-maroon hover:text-white sm:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next report"
          onClick={() => slide(1)}
          className="absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-paper-border/60 bg-paper-bg text-ink shadow-md transition hover:bg-maroon hover:text-white sm:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {insights.map((item) => (
            <Link
              key={item.id}
              href={`/insight/${item.id}`}
              className="group relative flex min-w-[280px] max-w-[280px] snap-start flex-col justify-between rounded-2xl border border-paper-border/40 bg-paper-card p-5 shadow-sm transition-all duration-300 hover:border-maroon/40 hover:shadow-md"
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-maroon/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-maroon">
                    {item.poll.category.replace(/_/g, " ")}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                    <Users className="h-3 w-3" /> {item.poll.total_votes} voted
                  </span>
                </div>
                <h4 className="line-clamp-3 text-sm font-bold leading-snug text-ink transition-colors group-hover:text-maroon">
                  {item.headline}
                </h4>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-paper-border/30 pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Read Report</span>
                <div className="rounded-full bg-ink/5 p-1.5 text-ink transition-colors group-hover:bg-maroon group-hover:text-paper-bg">
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
