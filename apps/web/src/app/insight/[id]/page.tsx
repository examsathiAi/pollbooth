"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft, Calendar, Share2, Users, MessageCircle, Check, Loader2 } from "lucide-react";

interface InsightDetail {
  id: string;
  headline: string;
  content: string;
  created_at: string;
  demographics_summary?: { key_takeaway?: string; dominant_age_group?: string };
  poll: { id: string; question: string; category: string; options: string[]; total_votes: number; total_opinions: number };
}
interface ResultRow { option: string; count: number; percentage: number }

const BAR_COLORS = ["#7A1E3A", "#D99A1E", "#1F8A70", "#C2415B", "#4B5FBF", "#8A6D3B"];

export default function InsightArticlePage() {
  const params = useParams();
  const id = params?.id as string;
  const [insight, setInsight] = useState<InsightDetail | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const insightRes = await api.get(`/api/v1/feed/insights/${id}`);
        const data = insightRes.data;
        setInsight(data);
        try {
          const pollRes = await api.get(`/api/v1/polls/${data.poll.id}`);
          if (Array.isArray(pollRes.data?.results)) setResults(pollRes.data.results);
          if (pollRes.data?.image_url) setImageUrl(pollRes.data.image_url);
        } catch {
          /* results are optional; the article still shows */
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load report");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-paper-bg"><Loader2 className="h-8 w-8 animate-spin text-maroon" /></div>;
  if (error || !insight) return <div className="p-10 text-center font-semibold text-ink">{error || "Report not found"}</div>;

  const pollLink = `/poll/${insight.poll.id}`;
  const maxPct = Math.max(0, ...results.map((r) => r.percentage || 0));
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${pollLink}?src=copy&card=result`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked: nothing to show */
    }
  };

  return (
    <div className="min-h-screen bg-paper-bg pb-24 font-sans">
      <header className="sticky top-0 z-40 border-b border-paper-border/30 bg-paper-bg/90 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/feed" className="inline-flex items-center gap-2 text-sm font-bold text-ink hover:text-maroon"><ArrowLeft className="h-4 w-4" /> Back to Feed</Link>
          <button onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-ink-muted hover:bg-black/5 hover:text-ink">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
            {copied ? "Link copied" : "Share"}
          </button>
        </div>
      </header>

      <div className="relative h-[38vh] min-h-[260px] w-full overflow-hidden bg-gradient-to-br from-[#5A1530] to-[#14050E]">
        {imageUrl && <img src={imageUrl} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10">
          <div className="mx-auto max-w-4xl">
            <span className="mb-3 inline-block rounded-sm bg-maroon px-3 py-1 text-[11px] font-bold tracking-wide text-white">
              {insight.poll.category.replace(/_/g, " ")} exit poll
            </span>
            <h1 className="font-headline text-3xl font-black leading-tight text-white drop-shadow-lg sm:text-5xl">{insight.headline}</h1>
          </div>
        </div>
      </div>

      <main className="relative z-20 mx-auto -mt-6 max-w-4xl rounded-t-3xl border border-paper-border/20 bg-paper-bg p-6 shadow-sm sm:p-10">
        <div className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-paper-border/30 pb-5 text-xs font-bold text-ink-muted">
          <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-maroon" /> {new Date(insight.created_at).toLocaleDateString()}</span>
          <span className="flex items-center gap-2"><Users className="h-4 w-4 text-maroon" /> {insight.poll.total_votes.toLocaleString()} votes</span>
          <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-maroon" /> {insight.poll.total_opinions.toLocaleString()} comments</span>
        </div>

        <p className="mb-6 font-serif text-xl font-semibold leading-snug text-ink sm:text-2xl">&ldquo;{insight.poll.question}&rdquo;</p>

        {results.length > 0 && (
          <section className="mb-10 rounded-2xl border border-paper-border/40 bg-paper-card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold text-ink">What people chose</h2>
            <div className="space-y-4">
              {results.map((r, i) => {
                const col = BAR_COLORS[i % BAR_COLORS.length];
                const lead = maxPct > 0 && r.percentage === maxPct;
                return (
                  <div key={r.option}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className={`text-[15px] ${lead ? "font-extrabold text-ink" : "font-semibold text-ink/80"}`}>{r.option}</span>
                      <span className="shrink-0 text-[15px] font-extrabold" style={{ color: col }}>{r.percentage}%<span className="ml-1.5 text-xs font-semibold text-ink-muted">({r.count.toLocaleString()})</span></span>
                    </div>
                    <div className="h-3.5 w-full overflow-hidden rounded-full bg-black/5">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(r.percentage, r.count > 0 ? 2 : 0)}%`, background: col }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {insight.demographics_summary?.key_takeaway && (
              <p className="mt-5 border-t border-paper-border/30 pt-4 text-sm leading-relaxed text-ink/80">{insight.demographics_summary.key_takeaway}</p>
            )}
            {insight.demographics_summary?.dominant_age_group && (
              <p className="mt-2 text-xs font-semibold text-ink-muted">Most active age group: {insight.demographics_summary.dominant_age_group}</p>
            )}
          </section>
        )}

        <div
          className="prose prose-lg prose-stone max-w-none space-y-6 font-serif leading-relaxed text-ink/85"
          dangerouslySetInnerHTML={{ __html: insight.content }}
        />

        <div className="mt-12 rounded-2xl bg-gradient-to-br from-[#5A1530] to-[#2B0A1B] p-6 text-center text-white">
          <p className="font-headline text-xl font-bold">Aapka kya kehna hai?</p>
          <p className="mt-1 text-sm text-white/70">Apna vote do aur dekho baaki kya soch rahe hain.</p>
          <Link href={pollLink} className="mt-4 inline-block rounded-full bg-[#FFB534] px-7 py-3 text-sm font-extrabold text-[#2B0A1B] active:scale-95">Vote karo</Link>
        </div>
      </main>
    </div>
  );
}
