"use client";

import Link from "next/link";
import { Home, Flame, Landmark, Newspaper, Tv, Trophy, MapPin, Shield, HelpCircle, Lightbulb, AlertTriangle } from "lucide-react";

const NAV_ITEMS = [
  { id: "for-you", label: "For You", icon: Home },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "local", label: "Local", icon: MapPin, category: "LOCAL" },
  { id: "news", label: "News", icon: Newspaper, category: "CURRENT_EVENTS" },
  { id: "bollywood", label: "Bollywood", icon: Tv, category: "BOLLYWOOD" },
  { id: "sports", label: "Sports", icon: Trophy, category: "SPORTS" },
  { id: "civic", label: "Civic", icon: Landmark, category: "CIVIC" },
];

interface FeedSidebarProps {
  activeCategory: string;
  onCategoryChange: (category: string, categoryFilter?: string) => void;
}

export function FeedSidebar({ activeCategory, onCategoryChange }: FeedSidebarProps) {
  return (
    <aside className="hidden w-full space-y-3 lg:block lg:max-h-full lg:overflow-y-auto scrollbar-auto-hide pr-2">
      <div className="space-y-1">
        <p className="px-3 py-2 text-[16px] font-bold text-ink-muted">Browse</p>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onCategoryChange(item.id, item.category)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[15px] font-semibold transition-all duration-200 ${
                  isActive ? "border-l-4 border-maroon bg-paper-card text-maroon" : "border-l-4 border-transparent text-ink hover:bg-paper-card"
                }`}
              >
                <Icon className={`h-[24px] w-[24px] shrink-0 ${isActive ? "text-maroon" : "text-ink-muted"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-paper-border/40 space-y-0.5 pt-3">
        <p className="px-3 py-2 text-[16px] font-bold text-ink-muted">Community</p>
        <Link href="/suggest" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-semibold text-ink hover:bg-paper-card transition-all duration-200">
          <Lightbulb className="h-[24px] w-[24px] shrink-0 text-ink-muted" /> Suggest a Poll
        </Link>
        <Link href="/civic/report" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-semibold text-ink hover:bg-paper-card transition-all duration-200">
          <AlertTriangle className="h-[24px] w-[24px] shrink-0 text-ink-muted" /> Report an Issue
        </Link>
      </div>

      <div className="border-t border-paper-border/40 space-y-0.5 pt-3">
        <p className="px-3 py-2 text-[16px] font-bold text-ink-muted">More</p>
        <Link href="/privacy" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-semibold text-ink hover:bg-paper-card transition-all duration-200">
          <Shield className="h-[24px] w-[24px] shrink-0 text-ink-muted" /> Privacy
        </Link>
        <Link href="/terms" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-semibold text-ink hover:bg-paper-card transition-all duration-200">
          <HelpCircle className="h-[24px] w-[24px] shrink-0 text-ink-muted" /> Terms
        </Link>
        <Link href="/grievance" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-semibold text-ink hover:bg-paper-card transition-all duration-200">
          <AlertTriangle className="h-[24px] w-[24px] shrink-0 text-ink-muted" /> Grievance
        </Link>
      </div>
    </aside>
  );
}
