"use client";

import { useMemo, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Download, Share2, Sparkles, MessageCircle, Linkedin, Copy, Check } from "lucide-react";

interface ShareCardGeneratorProps {
  title: string;
  headline?: string;
  subtitle?: string;
  voteCount?: number;
  resultData?: Array<{ label: string; value: number }>;
  shareUrl?: string;
  accent?: string;
  captions?: {
    whatsapp?: string;
    x?: string;
    facebook?: string;
    linkedin?: string;
  };
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

export function ShareCardGenerator({
  title,
  headline,
  subtitle,
  voteCount,
  resultData,
  shareUrl,
  captions,
}: ShareCardGeneratorProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareLink = useMemo(
    () => shareUrl || (typeof window !== "undefined" ? window.location.href : ""),
    [shareUrl]
  );

  const chartItems = useMemo(() => formatData(resultData), [resultData]);

  const generateCardBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      return await toBlob(cardRef.current, { cacheBust: true, quality: 0.95 });
    } catch {
      return null;
    }
  };

  const handleNativeShare = async (platformCaption?: string) => {
    setIsGenerating(true);
    try {
      const blob = await generateCardBlob();
      const shareText = platformCaption
        ? `${platformCaption}\n\nVote here: ${shareLink}`
        : `${headline || title}\n\nCast your vote on PollBooth: ${shareLink}`;

      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "pollbooth-card.png", { type: "image/png" })] })) {
        const file = new File([blob], "pollbooth-poll-card.png", { type: "image/png" });
        await navigator.share({
          title: title,
          text: shareText,
          url: shareLink,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: title,
          text: shareText,
          url: shareLink,
        });
      } else {
        await handleCopyLink(shareText);
      }
    } catch {
      // User cancelled or share failed silently
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async (customText?: string) => {
    const textToCopy = customText || `${title}\n${shareLink}`;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const openSocialUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToWhatsApp = () => {
    const caption = captions?.whatsapp || `${title} — What is your stance?`;
    const text = encodeURIComponent(`${caption}\n\n👉 Vote now: ${shareLink}`);
    openSocialUrl(`https://api.whatsapp.com/send?text=${text}`);
  };

  const shareToX = () => {
    const caption = captions?.x || title;
    const text = encodeURIComponent(caption);
    const url = encodeURIComponent(shareLink);
    openSocialUrl(`https://twitter.com/intent/tweet?text=${text}&url=${url}`);
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(shareLink);
    openSocialUrl(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
  };

  const shareToLinkedin = () => {
    const url = encodeURIComponent(shareLink);
    openSocialUrl(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Share this Poll</h3>
          <p className="text-xs text-slate-400">Share clickable link and custom card preview</p>
        </div>
        <button
          onClick={() => handleCopyLink()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied Link!" : "Copy Link"}
        </button>
      </div>

      {/* Hidden Card Render Container */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div ref={cardRef} className="space-y-3 bg-slate-950 p-4 text-white">
          <div className="text-xs font-bold uppercase tracking-wider text-violet-400">POLLBOOTH PUBLIC OPINION</div>
          <div className="text-lg font-bold text-slate-100">{title}</div>
          {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
          
          <div className="space-y-2 pt-2">
            {chartItems.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{item.label}</span>
                  <span className="font-semibold">{Math.round(item.value)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-violet-500" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-right text-[10px] text-slate-500">
            {voteCount ? `${voteCount.toLocaleString()} votes cast • ` : ""}vote at {shareLink.replace(/^https?:\/\//, "")}
          </div>
        </div>
      </div>

      {/* Sharing Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <button
          onClick={shareToWhatsApp}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </button>

        <button
          onClick={shareToX}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f4efe7] px-3 py-2.5 text-xs font-semibold text-[#1f1b18] border border-[#d8ceb8] hover:border-maroon hover:text-maroon"
        >
          <Sparkles className="h-4 w-4 text-maroon" /> X / Twitter
        </button>

        <button
          onClick={shareToFacebook}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-100"
        >
          <Share2 className="h-4 w-4" /> Facebook
        </button>

        <button
          onClick={() => handleNativeShare(captions?.whatsapp || captions?.x)}
          disabled={isGenerating}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-maroon px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#5c1709]"
        >
          <Download className="h-4 w-4" /> Native Card Share
        </button>
      </div>
    </div>
  );
}
