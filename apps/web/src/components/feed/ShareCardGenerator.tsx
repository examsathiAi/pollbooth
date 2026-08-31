"use client";

import { useMemo, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Download, Share2, Sparkles, MessageCircle, Copy, Check, Instagram, X } from "lucide-react";

interface ShareCardGeneratorProps {
  title: string;
  headline?: string;
  subtitle?: string;
  voteCount?: number;
  resultData?: Array<{ label: string; value: number }>;
  shareUrl?: string;
  captions?: { whatsapp?: string; x?: string; facebook?: string; instagram?: string; };
  hashtags?: string[];
}

const formatData = (data?: Array<{ label: string; value: number }>) => {
  if (!data || data.length === 0) return [];
  return [...data].sort((a, b) => b.value - a.value).slice(0, 4);
};

export function ShareCardGenerator({ title, voteCount, resultData, shareUrl, captions, hashtags = [] }: ShareCardGeneratorProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);

  const shareLink = useMemo(() => shareUrl || (typeof window !== "undefined" ? window.location.href : ""), [shareUrl]);
  const chartItems = useMemo(() => formatData(resultData), [resultData]);

  // Ensure #pollbooth is always included
  const completeHashtags = useMemo(() => {
    const tags = Array.isArray(hashtags) ? [...hashtags] : [];
    if (!tags.some(t => t.toLowerCase() === "#pollbooth" || t.toLowerCase() === "pollbooth")) {
      tags.push("#pollbooth");
    }
    return tags.map(t => t.startsWith("#") ? t : `#${t}`);
  }, [hashtags]);

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
      const shareText = `${title}\n\nCast your vote: ${shareLink}\n\n${completeHashtags.join(" ")}`;

      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "pollbooth.png", { type: "image/png" })] })) {
        await navigator.share({ title, text: shareText, url: shareLink, files: [new File([blob], "pollbooth.png", { type: "image/png" })] });
      } else if (navigator.share) {
        await navigator.share({ title, text: shareText, url: shareLink });
      } else {
        await handleCopyLink();
      }
    } catch (e) {
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`${title}\n${shareLink}\n\n${completeHashtags.join(" ")}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleInstagramShare = async () => {
    const igText = captions?.instagram || `${title}\n\nCast your verified vote on PollBooth: ${shareLink}\n\n${completeHashtags.join(" ")}`;
    await navigator.clipboard.writeText(igText);
    setIgCopied(true);
    setTimeout(() => setIgCopied(false), 2500);
  };

  const openSocialUrl = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  // Clean comma-separated list for Twitter/X native parameters
  const twitterTagsParam = completeHashtags.map(t => t.replace("#", "").trim()).join(",");

  if (!isModalOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
    >
      <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={() => setIsModalOpen(false)}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="mb-6 text-center text-lg font-bold text-slate-900">Share Poll</h3>

        {/* Off-screen capture surface - completely untouched to preserve image generation logic */}
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, pointerEvents: "none" }}>
          <div ref={cardRef} style={{ backgroundColor: '#ffffff', padding: '24px', width: '600px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: '#8a2a1b', marginBottom: '12px', textTransform: 'uppercase' }}>
              PollBooth Public Opinion
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.3, marginBottom: '24px', color: '#111827' }}>
              {title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chartItems.map((item) => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                    <span>{item.label}</span>
                    <span>{Math.round(item.value)}%</span>
                  </div>
                  <div style={{ height: '10px', width: '100%', backgroundColor: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.value}%`, backgroundColor: '#10b981', borderRadius: '999px' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
              <div>{voteCount ? `${voteCount.toLocaleString()} verified votes` : "Live tracking active"}</div>
              <div style={{ color: '#8a2a1b' }}>#pollbooth • pollbooth.com</div>
            </div>
          </div>
        </div>

        {/* New Facebook-style Icon Grid */}
        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
          <button onClick={() => openSocialUrl(`https://api.whatsapp.com/send?text=${encodeURIComponent((captions?.whatsapp || title) + "\n\n👉 Vote here: " + shareLink + "\n\n" + completeHashtags.join(" "))}`)} className="group flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100 group-active:scale-95">
              <MessageCircle className="h-6 w-6 fill-current" />
            </div>
            <span className="text-[11px] font-semibold text-slate-600">WhatsApp</span>
          </button>

          <button onClick={() => openSocialUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`)} className="group flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100 group-active:scale-95">
              <Share2 className="h-6 w-6 fill-current" />
            </div>
            <span className="text-[11px] font-semibold text-slate-600">Facebook</span>
          </button>

          <button onClick={() => openSocialUrl(`https://twitter.com/intent/tweet?text=${encodeURIComponent(captions?.x || title)}&url=${encodeURIComponent(shareLink)}&hashtags=${twitterTagsParam}`)} className="group flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-800 transition-colors group-hover:bg-slate-200 group-active:scale-95">
              <Sparkles className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-semibold text-slate-600">X / Twitter</span>
          </button>

          <button onClick={handleInstagramShare} className="group flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-50 text-pink-600 transition-colors group-hover:bg-pink-100 group-active:scale-95">
              <Instagram className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-semibold text-slate-600">{igCopied ? "Copied!" : "Instagram"}</span>
          </button>
        </div>

        {/* Full width Copy button underneath */}
        <div className="mt-8">
          <button 
            onClick={handleCopyLink} 
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3.5 text-[13px] font-bold text-slate-700 transition-all hover:bg-slate-100 active:scale-[0.98]"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "Link & Hashtags Copied!" : "Copy Link & Hashtags"}
          </button>
        </div>
        
      </div>
    </div>
  );
}
