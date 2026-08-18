const fs = require('fs');

// --- 1. PATCH PAGE.TSX (Absolute OG Image URL) ---
const pageFile = 'apps/web/src/app/poll/[id]/page.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');
pageCode = pageCode.replace(/images:\s*\["\/og-card\.png"\]/g, 'images: [`${SITE_URL}/og-card.png`]');
fs.writeFileSync(pageFile, pageCode);


// --- 2. PATCH SHARECARDGENERATOR.TSX (Professional Design + Inline Hex Codes) ---
const cardFile = 'apps/web/src/components/feed/ShareCardGenerator.tsx';
const newCardCode = `"use client";

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
}

const formatData = (data?: Array<{ label: string; value: number }>) => {
  if (!data || data.length === 0) return [];
  return [...data].sort((a, b) => b.value - a.value).slice(0, 4);
};

export function ShareCardGenerator({ title, voteCount, resultData, shareUrl, captions }: ShareCardGeneratorProps) {
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
      const shareText = \`\${title}\\n\\nCast your vote on PollBooth: \${shareLink}\`;

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
    await navigator.clipboard.writeText(\`\${title}\\n\${shareLink}\`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const openSocialUrl = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <div className="space-y-4 rounded-3xl border border-paper-border bg-paper-bg p-5 shadow-sm mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-ink">Share this Poll</h3>
          <p className="text-xs text-ink-muted mt-0.5">Export a high-quality card or copy the link</p>
        </div>
        <button onClick={handleCopyLink} className="inline-flex items-center gap-1.5 rounded-xl border border-paper-border bg-transparent px-3 py-2 text-xs font-semibold text-ink hover:bg-ink/5 transition-colors">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>

      {/* Capture Area: Strict inline hex codes to bypass html-to-image CSS-variable loss */}
      <div className="overflow-hidden rounded-2xl border border-paper-border/60 shadow-sm">
        <div ref={cardRef} style={{ backgroundColor: '#ffffff', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
                  <div style={{ height: '100%', width: \`\${item.value}%\`, backgroundColor: '#10b981', borderRadius: '999px' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
            <div>{voteCount ? \`\${voteCount.toLocaleString()} verified votes\` : "Live tracking active"}</div>
            <div style={{ color: '#8a2a1b' }}>pollbooth.com</div>
          </div>
        </div>
      </div>

      {/* Conversion Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
        <button onClick={() => openSocialUrl(\`https://api.whatsapp.com/send?text=\${encodeURIComponent((captions?.whatsapp || title) + "\\n\\n👉 Vote now: " + shareLink)}\`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-100">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </button>
        <button onClick={() => openSocialUrl(\`https://twitter.com/intent/tweet?text=\${encodeURIComponent(captions?.x || title)}&url=\${encodeURIComponent(shareLink)}\`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200">
          <Sparkles className="h-4 w-4" /> X / Twitter
        </button>
        <button onClick={() => openSocialUrl(\`https://www.facebook.com/sharer/sharer.php?u=\${encodeURIComponent(shareLink)}\`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-3 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100">
          <Share2 className="h-4 w-4" /> Facebook
        </button>
        <button onClick={handleNativeShare} disabled={isGenerating} className="inline-flex items-center justify-center gap-2 rounded-xl bg-maroon px-3 py-3 text-xs font-bold text-white hover:bg-[#6b1e13] transition-colors shadow-sm disabled:opacity-50">
          <Download className="h-4 w-4" /> Export Image
        </button>
      </div>
    </div>
  );
}
`;
fs.writeFileSync(cardFile, newCardCode);

console.log('Professional SEO and Client-side Share fixes applied.');
