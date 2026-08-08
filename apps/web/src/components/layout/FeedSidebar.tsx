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
    <aside className="hidden w-full space-y-6 lg:block lg:max-h-full lg:overflow-y-auto scrollbar-paper">
      <div className="space-y-1">
        <p className="px-3 py-1 text-xs font-sans uppercase tracking-widest text-ink border-b-2 border-ink">Browse</p>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onCategoryChange(item.id, item.category)}
                className={`flex w-full items-center gap-3 rounded-sm px-4 py-3 text-left text-sm font-medium transition ${
                  isActive ? "border-l-4 border-maroon bg-paper-card text-maroon" : "text-ink hover:bg-paper-card"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-maroon" : "text-ink-muted"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-paper-border space-y-1 pt-6">
        <p className="px-3 py-1 text-xs font-sans uppercase tracking-widest text-ink border-b-2 border-ink">Community</p>
        <Link href="/suggest" className="flex items-center gap-3 rounded-sm px-4 py-3 text-sm font-medium text-ink hover:bg-paper-card">
          <Lightbulb className="h-5 w-5 text-ink-muted" /> Suggest a Poll
        </Link>
        <Link href="/civic/report" className="flex items-center gap-3 rounded-sm px-4 py-3 text-sm font-medium text-ink hover:bg-paper-card">
          <AlertTriangle className="h-5 w-5 text-ink-muted" /> Report an Issue
        </Link>
      </div>

      <div className="border-t border-paper-border space-y-1 pt-6">
        <p className="px-3 py-1 text-xs font-sans uppercase tracking-widest text-ink border-b-2 border-ink">More</p>
        <Link href="/privacy" className="flex items-center gap-3 rounded-sm px-4 py-3 text-sm font-medium text-ink hover:bg-paper-card">
          <Shield className="h-5 w-5 text-ink-muted" /> Privacy
        </Link>
        <Link href="/terms" className="flex items-center gap-3 rounded-sm px-4 py-3 text-sm font-medium text-ink hover:bg-paper-card">
          <HelpCircle className="h-5 w-5 text-ink-muted" /> Terms
        </Link>
        <Link href="/grievance" className="flex items-center gap-3 rounded-sm px-4 py-3 text-sm font-medium text-ink hover:bg-paper-card">
          <AlertTriangle className="h-5 w-5 text-ink-muted" /> Grievance
        </Link>
      </div>
    </aside>
  );
}
