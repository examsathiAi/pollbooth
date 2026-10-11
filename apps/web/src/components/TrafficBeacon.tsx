"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pollRefFromPath, rememberSource, sendTrack } from "@/lib/track";

// Counts one visit per poll per browser session, tagged with the share source if there is one.
export function TrafficBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    rememberSource();
    const ref = pollRefFromPath(pathname || "");
    const hasSrc = typeof window !== "undefined" && !!new URLSearchParams(window.location.search).get("src");
    if (ref) sendTrack("VISIT", ref, "visit_" + ref);
    else if (hasSrc) sendTrack("VISIT", undefined, "visit_" + (pathname || "/"));
  }, [pathname]);
  return null;
}
