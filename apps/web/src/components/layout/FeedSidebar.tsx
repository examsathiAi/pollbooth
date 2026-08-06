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
    <aside className="hidden w-full space-y-6 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <div className="space-y-1">
        <p className="px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Browse</p>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onCategoryChange(item.id, item.category)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                  isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-gray-200 space-y-1 pt-6">
        <p className="px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Community</p>
        <Link href="/suggest" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Lightbulb className="h-5 w-5" /> Suggest a Poll
        </Link>
        <Link href="/civic/report" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <AlertTriangle className="h-5 w-5" /> Report an Issue
        </Link>
      </div>

      <div className="border-t border-gray-200 space-y-1 pt-6">
        <p className="px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">More</p>
        <Link href="/privacy" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Shield className="h-5 w-5" /> Privacy
        </Link>
        <Link href="/terms" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <HelpCircle className="h-5 w-5" /> Terms
        </Link>
        <Link href="/grievance" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <AlertTriangle className="h-5 w-5" /> Grievance
        </Link>
      </div>
    </aside>
  );
}
