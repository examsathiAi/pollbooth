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
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-ink-muted">
          <span className="truncate pr-2 text-ink">{item.label}</span>
          <span className="text-ink">{Math.round(item.value)}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-paper-card">
          <div
            className={`h-full rounded-full ${index === 0 ? "bg-maroon" : "bg-paper-border"}`}
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
        background: "#f5f1e6",
        color: "#171512",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        border: "1px solid rgba(184, 179, 160, 0.4)",
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7a1f10", fontFamily: "font-headline" }}>Pulse</div>
          <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#5c5541", fontFamily: "font-sans" }}>Live update</div>
        </div>
        <div style={{ marginTop: 24, maxWidth: width - padding * 2 }}>
          <div style={{ fontSize: isPreview ? 28 : 56, lineHeight: 1.03, fontWeight: 900, color: "#171512", fontFamily: "font-headline" }}>{headline}</div>
          <div style={{ marginTop: 10, fontSize: isPreview ? 12 : 16, lineHeight: 1.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5c5541", fontFamily: "font-sans" }}>{subtitle}</div>
          <div style={{ marginTop: 18, fontSize: isPreview ? 14 : 24, lineHeight: 1.5, color: "#171512", fontFamily: "font-headline" }}>{title}</div>
        </div>
      </div>

      <div style={{ marginTop: 28, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              width: "100%",
              padding: 24,
              borderRadius: 12,
              background: "#fdf8ec",
              border: "1px solid rgba(184, 179, 160, 0.4)",
            }}
          >
            {renderBars(resultData)}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginTop: 28 }}>
          <div>
            <div style={{ fontSize: isPreview ? 12 : 14, textTransform: "uppercase", letterSpacing: "0.18em", color: "#5c5541", fontFamily: "font-sans" }}>Total votes</div>
            <div style={{ marginTop: 8, fontSize: isPreview ? 24 : 36, fontWeight: 800, color: "#171512", fontFamily: "font-headline" }}>{voteCount?.toLocaleString() ?? "0"}</div>
          </div>
          <div style={{ minWidth: isPreview ? 120 : 180 }}>
            <div style={{ background: "#7a1f10", padding: isPreview ? "10px 14px" : "18px 22px", borderRadius: 8, textAlign: "center", color: "#ffffff", fontWeight: 700, fontSize: isPreview ? 12 : 16 }}>Vote now</div>
            <div style={{ marginTop: 12, fontSize: isPreview ? 10 : 14, color: "#5c5541", lineHeight: 1.4, fontFamily: "font-sans" }}>
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
  accent = "",
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
      <div className="overflow-hidden rounded-sm border border-paper-border bg-paper-card p-[1px]">
        <div className="rounded-sm bg-paper-card p-5 text-ink">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-ink-muted font-sans">
            <span className="font-headline text-maroon">Pulse</span>
            <span>Live update</span>
          </div>
          <div className="mt-4 space-y-4">
            <div className="text-3xl font-headline font-black leading-[1.05] text-ink sm:text-4xl">{headlineText}</div>
            <div className="max-w-2xl text-sm leading-6 text-ink-muted sm:text-base font-sans">{title}</div>
          </div>
          <div className="mt-5 rounded-sm border border-paper-border bg-paper-bg p-4">
            {renderBars(chartItems)}
          </div>
          <div className="mt-5 flex flex-col gap-3 rounded-sm border border-paper-border bg-paper-card p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-ink-muted font-sans">Total votes</p>
              <p className="mt-2 text-2xl font-semibold text-ink font-headline">{voteCount?.toLocaleString() ?? "0"}</p>
            </div>
            <div className="rounded-sm bg-maroon px-4 py-3 text-sm font-semibold text-white">
              <p>Vote now</p>
              <p className="mt-2 break-words text-[13px] text-paper-border">{shareLink.replace(/^https?:\/\//, "")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          onClick={() => void shareDirect("facebook")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-sm bg-maroon px-4 py-3 text-sm font-semibold text-white transition hover:bg-maroon/90 disabled:opacity-60"
        >
          <Share2 className="h-4 w-4" /> Facebook
        </button>
        <button
          onClick={() => void shareDirect("instagram")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-sm bg-maroon px-4 py-3 text-sm font-semibold text-white transition hover:bg-maroon/90 disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" /> Instagram
        </button>
        <button
          onClick={() => void shareDirect("whatsapp")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-sm bg-maroon px-4 py-3 text-sm font-semibold text-white transition hover:bg-maroon/90 disabled:opacity-60"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </button>
        <button
          onClick={() => void shareDirect("native")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-sm bg-maroon px-4 py-3 text-sm font-semibold text-white transition hover:bg-maroon/90 disabled:opacity-60"
        >
          <Share2 className="h-4 w-4" /> Others
        </button>
        <button
          onClick={() => void shareDirect("telegram")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-sm bg-maroon px-4 py-3 text-sm font-semibold text-white transition hover:bg-maroon/90 disabled:opacity-60"
        >
          <Send className="h-4 w-4" /> Telegram
        </button>
        <button
          onClick={() => void shareDirect("x")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-sm bg-maroon px-4 py-3 text-sm font-semibold text-white transition hover:bg-maroon/90 disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" /> X / Twitter
        </button>
        <button
          onClick={() => void shareDirect("linkedin")}
          disabled={isGenerating}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-sm bg-maroon px-4 py-3 text-sm font-semibold text-white transition hover:bg-maroon/90 disabled:opacity-60"
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
