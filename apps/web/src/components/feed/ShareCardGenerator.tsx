"use client";

import { useMemo, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Share2, Sparkles } from "lucide-react";

interface ShareCardGeneratorProps {
  title: string;
  subtitle?: string;
  accent?: string;
}

export function ShareCardGenerator({ title, subtitle = "Pulse community pulse", accent = "from-violet-600 via-fuchsia-500 to-cyan-400" }: ShareCardGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const shareText = useMemo(() => `${title} · ${subtitle}`, [title, subtitle]);

  const handleExport = async () => {
    const node = document.getElementById("pulse-share-card");
    if (!node) return;

    setIsGenerating(true);
    try {
      const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = "pulse-share-card.png";
      link.href = dataUrl;
      link.click();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    const shareData = { title: "Pulse story", text: shareText, url: window.location.href };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareText);
      window.alert("Story text copied. Paste it into WhatsApp or Instagram Stories.");
    }
  };

  return (
    <div className="space-y-3">
      <div id="pulse-share-card" className={`rounded-[28px] border border-slate-700 bg-gradient-to-br ${accent} p-[1px]`}>
        <div className="rounded-[27px] bg-slate-950 p-5 text-slate-100">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
            <span>Pulse</span>
            <span>Live</span>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-[15px] font-semibold leading-6 text-white">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</p>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-cyan-300">
            <Sparkles className="h-4 w-4" />
            Swipe. Share. Spark conversation.
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleShare} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-3 py-3 text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-slate-800">
          <Share2 className="h-4 w-4" /> Share story
        </button>
        <button onClick={handleExport} disabled={isGenerating} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-500 hover:text-cyan-300 disabled:opacity-60">
          <Download className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
