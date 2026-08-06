"use client";

import { useMemo, useRef, useState } from "react";
import { toBlob, toPng } from "html-to-image";
import { Download, Share2, Sparkles, MessageCircle, Send, Linkedin } from "lucide-react";

interface ShareCardGeneratorProps {
  title: string;
  headline?: string;
  subtitle?: string;
  voteCount?: number;
  resultData?: Array<{ label: string; value: number }>;
  shareUrl?: string;
  accent?: string;
}

const formatData = (data?: Array<{ label: string; value: number }>) => {
  if (!data || data.length === 0) {
    return [
      { label: "Leading option", value: 62 },
      { label: "Second option", value: 28 },
      { label: "Other options", value: 10 },
    ];
  }
  const sorted = [...data].sort((a, b) => b.value - a.value);
  return sorted.slice(0, 4);
};

const renderBars = (data: Array<{ label: string; value: number }>) => (
  <div className="space-y-3">
    {data.map((item, index) => (
      <div key={item.label}>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-slate-300">
          <span className="truncate pr-2">{item.label}</span>
          <span>{Math.round(item.value)}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-900">
          <div
            className={`h-full rounded-full ${index === 0 ? "bg-cyan-400" : "bg-slate-400"}`}
            style={{ width: `${Math.max(item.value, 6)}%` }}
          />
        </div>
      </div>
    ))}
  </div>
);

const renderCard = (
  title: string,
  headline: string,
  subtitle: string,
  voteCount: number | undefined,
  resultData: Array<{ label: string; value: number }>,
  shareUrl: string,
  width: number,
  height: number,
  isPreview = false
) => {
  const padding = isPreview ? 20 : 64;
  return (
    <div
      style={{
        width,
        height,
        padding,
        background: "#020617",
        color: "#e2e8f0",
        borderRadius: 48,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        border: "1px solid rgba(148, 163, 184, 0.12)",
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7dd3fc" }}>Pulse</div>
          <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#94a3b8" }}>Live update</div>
        </div>
        <div style={{ marginTop: 24, maxWidth: width - padding * 2 }}>
          <div style={{ fontSize: isPreview ? 28 : 56, lineHeight: 1.03, fontWeight: 900, color: "#ffffff" }}>{headline}</div>
          <div style={{ marginTop: 10, fontSize: isPreview ? 12 : 16, lineHeight: 1.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#67e8f9" }}>{subtitle}</div>
          <div style={{ marginTop: 18, fontSize: isPreview ? 14 : 24, lineHeight: 1.5, color: "#cbd5e1" }}>{title}</div>
        </div>
      </div>

      <div style={{ marginTop: 28, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              width: "100%",
              padding: 24,
              borderRadius: 32,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(148, 163, 184, 0.12)",
            }}
          >
            {renderBars(resultData)}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginTop: 28 }}>
          <div>
            <div style={{ fontSize: isPreview ? 12 : 14, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>Total votes</div>
            <div style={{ marginTop: 8, fontSize: isPreview ? 24 : 36, fontWeight: 800, color: "#7dd3fc" }}>{voteCount?.toLocaleString() ?? "0"}</div>
          </div>
          <div style={{ minWidth: isPreview ? 120 : 180 }}>
            <div style={{ background: "#2563eb", padding: isPreview ? "10px 14px" : "18px 22px", borderRadius: 999, textAlign: "center", color: "#ffffff", fontWeight: 700, fontSize: isPreview ? 12 : 16 }}>Vote now</div>
            <div style={{ marginTop: 12, fontSize: isPreview ? 10 : 14, color: "#94a3b8", lineHeight: 1.4 }}>
              {shareUrl.replace(/^https?:\/\//, "")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function ShareCardGenerator({
  title,
  headline,
  subtitle = "Pulse community pulse",
  voteCount,
  resultData,
  shareUrl,
  accent = "from-violet-600 via-fuchsia-500 to-cyan-400",
}: ShareCardGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const squareRef = useRef<HTMLDivElement | null>(null);
  const storyRef = useRef<HTMLDivElement | null>(null);

  const shareLink = useMemo(() => shareUrl || (typeof window !== "undefined" ? window.location.href : ""), [shareUrl]);
  const chartItems = useMemo(() => formatData(resultData), [resultData]);
  const headlineText = useMemo(
    () => headline || `${chartItems[0].label} leads with ${Math.round(chartItems[0].value)}%`,
    [headline, chartItems]
  );

  const platformShareUrl = (platform: "facebook" | "instagram" | "whatsapp" | "telegram" | "x" | "linkedin") => {
    const text = `${headlineText} — ${title}`;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(shareLink);
    const encodedQuote = encodeURIComponent(text);

    switch (platform) {
      case "facebook":
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedQuote}`;
      case "instagram":
        return "https://www.instagram.com/";
      case "whatsapp":
        return `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
      case "telegram":
        return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
      case "x":
        return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
      case "linkedin":
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
      default:
        return shareLink;
    }
  };

  const exportNode = async (format: "square" | "story") => {
    const node = format === "story" ? storyRef.current : squareRef.current;
    if (!node) return null;
    return await toPng(node, { cacheBust: true, pixelRatio: 2 });
  };

  const downloadImage = async (format: "square" | "story") => {
    setIsGenerating(true);
    try {
      const dataUrl = await exportNode(format);
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `pulse-${format}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsGenerating(false);
    }
  };

  const shareDirect = async (platform: "native" | "facebook" | "instagram" | "whatsapp" | "telegram" | "x" | "linkedin") => {
    setIsGenerating(true);
    try {
      if (platform === "native") {
        if (navigator.share) {
          await navigator.share({
            title: "Pulse live update",
            text: `${headlineText} — ${title}`,
            url: shareLink,
          });
          return;
        }
        await navigator.clipboard.writeText(`${headlineText} — ${title} \n${shareLink}`);
        window.alert("Share summary copied. Paste it into your preferred app.");
        return;
      }

      if (platform === "instagram") {
        const text = `${headlineText} — ${title} \n${shareLink}`;
        await navigator.clipboard.writeText(text);
        window.open(platformShareUrl(platform), "_blank", "noopener,noreferrer");
        window.alert("Share text copied. Paste it into Instagram to post the story or reel.");
        return;
      }

      if (platform === "facebook" || platform === "whatsapp" || platform === "telegram" || platform === "x" || platform === "linkedin") {
        const url = platformShareUrl(platform);
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
    } catch {
      window.alert("Unable to open the share flow immediately. Please use the download options to save the card.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[28px] border border-slate-700 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 p-[1px] shadow-xl">
        <div className="rounded-[27px] bg-slate-950 p-5 text-slate-100">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
            <span>Pulse</span>
            <span>Live update</span>
          </div>
          <div className="mt-4 space-y-4">
            <div className="text-3xl font-black leading-[1.05] text-white sm:text-4xl">{headlineText}</div>
            <div className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{title}</div>
          </div>
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
            {renderBars(chartItems)}
          </div>
          <div className="mt-5 flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Total votes</p>
              <p className="mt-2 text-2xl font-semibold text-cyan-300">{voteCount?.toLocaleString() ?? "0"}</p>
            </div>
            <div className="rounded-3xl bg-slate-800 px-4 py-3 text-sm text-slate-200">
              <p className="font-semibold">Vote now</p>
              <p className="mt-2 break-words text-[13px] text-slate-400">{shareLink.replace(/^https?:\/\//, "")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          onClick={() => void shareDirect("facebook")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          <Share2 className="h-4 w-4" /> Facebook
        </button>
        <button
          onClick={() => void shareDirect("instagram")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" /> Instagram
        </button>
        <button
          onClick={() => void shareDirect("whatsapp")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl border border-emerald-500 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-60"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </button>
        <button
          onClick={() => void shareDirect("native")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl border border-cyan-500 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-60"
        >
          <Share2 className="h-4 w-4" /> Others
        </button>
        <button
          onClick={() => void shareDirect("telegram")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl border border-sky-500 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-60"
        >
          <Send className="h-4 w-4" /> Telegram
        </button>
        <button
          onClick={() => void shareDirect("x")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl border border-slate-500 bg-slate-500/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-500/20 disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" /> X / Twitter
        </button>
        <button
          onClick={() => void shareDirect("linkedin")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl border border-blue-500 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-60"
        >
          <Linkedin className="h-4 w-4" /> LinkedIn
        </button>
      </div>

      <div className="pointer-events-none absolute left-[-9999px] top-0 opacity-0">
        <div ref={squareRef} style={{ width: 1080, height: 1080 }}>
          {renderCard(title, headlineText, subtitle, voteCount, chartItems, shareLink, 1080, 1080)}
        </div>
        <div ref={storyRef} style={{ width: 1080, height: 1920 }}>
          {renderCard(title, headlineText, subtitle, voteCount, chartItems, shareLink, 1080, 1920)}
        </div>
      </div>
    </div>
  );
}
