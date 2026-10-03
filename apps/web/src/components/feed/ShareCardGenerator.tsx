"use client";

import { useMemo, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Download, Share2, Sparkles, MessageCircle, Copy, Check, Instagram, X } from "lucide-react";

const MIN_VOTES_FOR_RESULT_CARD = 0;
const OPTION_COLORS = ["#FFB534", "#4FE3C1", "#FF7A8C", "#FFE9A8"];
interface ShareCardGeneratorProps {
  title: string;
  headline?: string;
  subtitle?: string;
  voteCount?: number;
  resultData?: Array<{ label: string; value: number }>;
  shareUrl?: string;
  captions?: { whatsapp?: string; x?: string; facebook?: string; instagram?: string; };
  hashtags?: string[];
  onClose?: () => void;
}

const formatData = (data?: Array<{ label: string; value: number }>) => {
  if (!data || data.length === 0) return [];
  return [...data].sort((a, b) => b.value - a.value).slice(0, 4);
};

export function ShareCardGenerator({ title, voteCount, resultData, shareUrl, captions, hashtags = [], onClose }: ShareCardGeneratorProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const closeModal = () => {
    setIsModalOpen(false);
    if (onClose) onClose();
  };

  const shareLink = useMemo(() => (shareUrl || (typeof window !== "undefined" ? window.location.href : "")).replace("/insight/", "/poll/"), [shareUrl]);
  const chartItems = useMemo(() => formatData(resultData), [resultData]);
  const optionItems = useMemo(() => (resultData || []).slice(0, 4), [resultData]);

  // Ensure #pollbooth is always included
  const completeHashtags = useMemo(() => {
    const tags = Array.isArray(hashtags) ? [...hashtags] : [];
    if (!tags.some(t => t.toLowerCase() === "#pollbooth" || t.toLowerCase() === "pollbooth")) {
      tags.push("#pollbooth");
    }
    return tags.map(t => t.startsWith("#") ? t : `#${t}`);
  }, [hashtags]);
  // Clean share texts: no duplicate hashtags, link on its own last line
  const whatsappMessage = useMemo(() => {
    const raw = captions?.whatsapp || title;
    const cleaned = raw
      .replace(/https?:\/\/\S+/g, "")
      .replace(/#[A-Za-z0-9_]+/g, "")
      .replace(/Vote here:?/gi, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return `${cleaned}\n\n${shareLink}`;
  }, [captions, title, shareLink]);

  const xText = useMemo(() => {
    return (captions?.x || title)
      .replace(/https?:\/\/\S+/g, "")
      .replace(/#[A-Za-z0-9_]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }, [captions, title]);
  const fbText = useMemo(() => {
    const base = (captions?.facebook || title)
      .replace(/https?:\/\/\S+/g, "")
      .replace(/#[A-Za-z0-9_]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return base.length > 220 ? base.slice(0, 217).trimEnd() + "..." : base;
  }, [captions, title]);

  const generateCardBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      return await toBlob(cardRef.current, {
        cacheBust: true,
        quality: 1.0,
        pixelRatio: 2,
        skipFonts: true,
        style: { transform: 'scale(1)', margin: '0' }
      });
    } catch {
      return null;
    }
  };

  const handleNativeShare = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateCardBlob();
      const shareText = whatsappMessage;

      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "pollbooth.png", { type: "image/png" })] })) {
        await navigator.share({ title, text: shareText, url: shareLink, files: [new File([blob], "pollbooth.png", { type: "image/png" })] });
      } else if (navigator.share) {
        await navigator.share({ title, text: shareText, url: shareLink });
      } else {
        await downloadCard();
      }
    } catch (e) {
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadCard = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateCardBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pollbooth-poll.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
      setIsGenerating(false);
    }
  };
  const handleInstagramShare = async () => {
    const igText = captions?.instagram || `${title}\n\nCast your verified vote on PollBooth: ${shareLink}\n\n${completeHashtags.join(" ")}`;
    await navigator.clipboard.writeText(igText);
    await downloadCard();
    setIgCopied(true);
    setTimeout(() => setIgCopied(false), 2500);
  };

  const openSocialUrl = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  // Clean comma-separated list for Twitter/X native parameters
  const twitterTagsParam = completeHashtags.slice(0, 3).map(t => t.replace("#", "").trim()).join(",");

  if (!isModalOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={() => closeModal()}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="mb-6 text-center text-lg font-bold text-slate-900">Share Poll</h3>

        {/* Off-screen capture surface for the shareable poll image (exports 1080x1350) */}
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, pointerEvents: "none" }}>
          <div
            ref={cardRef}
            style={{
              width: "540px", height: "675px", boxSizing: "border-box", padding: "36px",
              display: "flex", flexDirection: "column", overflow: "hidden", color: "#ffffff",
              background: "radial-gradient(circle at 78% 18%, #5A1530 0%, #2B0A1B 55%, #14050E 100%)",
              fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "28px", fontWeight: 700 }}>PollBooth</div>
              <div style={{ background: "#E2283C", borderRadius: "999px", padding: "6px 14px", fontSize: "14px", fontWeight: 700 }}>Aaj ka poll</div>
            </div>
            <div style={{ marginTop: "30px", fontSize: `${title.length > 90 ? 27 : title.length > 60 ? 31 : 36}px`, fontWeight: 800, lineHeight: 1.15, maxHeight: "170px", overflow: "hidden" }}>
              {title}
            </div>
            <div style={{ marginTop: "26px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {optionItems.map((item, i) => {
                const col = OPTION_COLORS[i % OPTION_COLORS.length];
                return (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "14px", border: `2.5px solid ${col}`, borderRadius: "22px", padding: "11px 18px", background: "rgba(255,255,255,0.08)" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "999px", border: `3px solid ${col}`, flexShrink: 0 }} />
                    <div style={{ fontSize: "20px", fontWeight: 700, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.label}</div>
                  </div>
                );
              })}
            </div>
            {(voteCount ?? 0) >= 25 && chartItems.length > 0 && (
              <div style={{ marginTop: "14px", fontSize: "15px", fontWeight: 700, color: "#FFB534" }}>
                Abhi tak: {chartItems[0].label} aage hai ({Math.round(chartItems[0].value)}%)
              </div>
            )}
            <div style={{ flex: 1 }} />
            <div style={{ background: "#FFB534", color: "#2B0A1B", borderRadius: "999px", padding: "15px 0", textAlign: "center", fontSize: "22px", fontWeight: 800 }}>
              Vote karo, result dekho
            </div>
            <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 700 }}>
              <div style={{ color: "#FFB534" }}>pollbooth.in</div>
              <div style={{ color: "rgba(255,255,255,0.6)" }}>{voteCount ? `${voteCount.toLocaleString()} votes` : "Vote now"}</div>
            </div>
          </div>
        </div>

        {/* New Facebook-style Icon Grid */}
        <div className="flex flex-wrap justify-between items-center w-full px-2 gap-y-6">
          <button onClick={() => openSocialUrl(`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`)} className="group flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white transition-colors group-hover:bg-[#20bd5a] border-none group-active:scale-95">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.573c-.2 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            </div>
            <span className="text-[11px] font-semibold text-slate-600">WhatsApp</span>
          </button>

          <button onClick={() => openSocialUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}&quote=${encodeURIComponent(fbText)}`)} className="group flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1877F2] text-white transition-colors group-hover:bg-[#166fe5] border-none group-active:scale-95">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            <span className="text-[11px] font-semibold text-slate-600">Facebook</span>
          </button>

          <button onClick={() => openSocialUrl(`https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(shareLink)}&hashtags=${twitterTagsParam}`)} className="group flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white transition-colors group-hover:bg-gray-800 border-none group-active:scale-95">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
            </div>
            <span className="text-[11px] font-semibold text-slate-600">X / Twitter</span>
          </button>

          <button onClick={handleInstagramShare} className="group flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white transition-opacity group-hover:opacity-90 border-none group-active:scale-95">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.181a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z"/></svg>
            </div>
            <span className="text-[11px] font-semibold text-slate-600">{igCopied ? "Saved + copied!" : "Instagram"}</span>
          </button>
            <button onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl || '')}`, '_blank', 'noopener,noreferrer')} className="group flex flex-col items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0A66C2] text-white transition-colors group-hover:bg-[#084e96] border-none">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </div>
              <span className="text-[11px] font-semibold text-slate-600">LinkedIn</span>
            </button>
        </div>

        {/* Full width Copy button underneath */}
        <div className="mt-8">
          {(voteCount ?? 0) >= MIN_VOTES_FOR_RESULT_CARD && (
            <button
              onClick={handleNativeShare}
              disabled={isGenerating}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-[13px] font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60"
            >
              <Share2 className="h-4 w-4" />
              {isGenerating ? "Preparing image..." : "Share as image"}
            </button>
          )}
          <button 
            onClick={handleCopyLink} 
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3.5 text-[13px] font-bold text-slate-700 transition-all hover:bg-slate-100 active:scale-[0.98]"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "Link Copied!" : "Copy Link"}
          </button>
        </div>
        
      </div>
    </div>
  );
}
