"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Sparkles, TrendingUp, Users, ArrowRight } from "lucide-react";

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

export function InsightsSlider() {
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <div className="mb-6 rounded-2xl border border-paper-border/30 bg-paper-bg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-maroon animate-pollbooth" />
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">Loading Intelligence Briefs…</h3>
        </div>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-maroon" />
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-ink">PollBooth Intelligence & Exit Polls</h3>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-ink-muted">3-min reads</span>
      </div>

      <div className="overflow-x-auto pb-3 scrollbar-auto-hide">
        <div className="flex gap-4">
          {insights.map((item) => (
            <Link
              key={item.id}
              href={`/insight/${item.id}`}
              className="group relative flex min-w-[280px] max-w-[280px] flex-col justify-between rounded-2xl border border-paper-border/40 bg-paper-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-maroon/40 hover:shadow-md"
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-maroon/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-maroon">
                    {item.poll.category.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-ink-muted flex items-center gap-1">
                    <Users className="h-3 w-3" /> {item.poll.total_votes} voted
                  </span>
                </div>
                <h4 className="text-sm font-bold leading-snug text-ink line-clamp-3 group-hover:text-maroon transition-colors">
                  {item.headline}
                </h4>
              </div>

              <div className="mt-4 pt-3 border-t border-paper-border/30 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Read Report</span>
                <div className="rounded-full bg-ink/5 p-1.5 text-ink group-hover:bg-maroon group-hover:text-paper-bg transition-colors">
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
