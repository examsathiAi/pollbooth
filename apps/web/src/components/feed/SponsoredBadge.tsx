"use client";

import { useEffect, useRef } from "react";
import { sendTrack } from "@/lib/track";

// Same "Sponsored" label as before. When it is scrolled into view, one anonymous view is counted per visitor session.
export function SponsoredBadge({ pollId }: { pollId: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          sendTrack("IMPRESSION", pollId, "imp_" + pollId);
          obs.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [pollId]);
  return (
    <span ref={ref} className="whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-800 border border-amber-300 shadow-sm">Sponsored</span>
  );
}
