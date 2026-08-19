"use client";

import { useMemo, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Download, Share2, Sparkles, MessageCircle, Copy, Check } from "lucide-react";

interface ShareCardGeneratorProps {
  title: string;
  headline?: string;
  subtitle?: string;
  voteCount?: number;
  resultData?: Array<{ label: string; value: number }>;
  shareUrl?: string;
  captions?: { whatsapp?: string; x?: string; facebook?: string; };
  hashtags?: string[];
}

const formatData = (data?: Array<{ label: string; value: number }>) => {
  if (!data || data.length === 0) return [];
  return [...data].sort((a, b) => b.value - a.value).slice(0, 4);
};

export function ShareCardGenerator({ title, voteCount, resultData, shareUrl, captions, hashtags }: ShareCardGeneratorProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareLink = useMemo(() => shareUrl || (typeof window !== "undefined" ? window.location.href : ""), [shareUrl]);
  const chartItems = useMemo(() => formatData(resultData), [resultData]);

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
      const shareText = `${title}\n\nCast your vote on PollBooth: ${shareLink}`;

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
    await navigator.clipboard.writeText(`${title}\n${shareLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const openSocialUrl = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <div className="space-y-4 rounded-2xl border border-paper-border/60 bg-transparent p-4 mt-4 animate-in fade-in duration-300">
      
      {/* Hidden Capture Area: Bypasses duplicate visual bars on the frontend but allows image generation */}
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
            <div style={{ color: '#8a2a1b' }}>pollbooth.com</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button onClick={() => openSocialUrl(`https://api.whatsapp.com/send?text=${encodeURIComponent((captions?.whatsapp || title) + "\n\n👉 Vote now: " + shareLink)}`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-ink shadow-sm hover:bg-ink/5 transition-all active:scale-95 border border-paper-border/40">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </button>
        <button onClick={() => openSocialUrl(`https://twitter.com/intent/tweet?text=${encodeURIComponent(captions?.x || title)}&url=${encodeURIComponent(shareLink)}`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-ink shadow-sm hover:bg-ink/5 transition-all active:scale-95 border border-paper-border/40">
          <Sparkles className="h-4 w-4" /> X / Twitter
        </button>
        <button onClick={() => openSocialUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-ink shadow-sm hover:bg-ink/5 transition-all active:scale-95 border border-paper-border/40">
          <Share2 className="h-4 w-4" /> Facebook
        </button>
        <button onClick={handleNativeShare} disabled={isGenerating} className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-ink/80 transition-all active:scale-95 disabled:opacity-50">
          <Download className="h-4 w-4" /> Save Card
        </button>
        <button onClick={handleCopyLink} className="col-span-2 sm:col-span-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-ink shadow-sm hover:bg-ink/5 transition-all active:scale-95 border border-paper-border/40">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied to clipboard!" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
