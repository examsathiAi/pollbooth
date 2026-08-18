"use client";

import { Flame, Sparkles, Trophy } from "lucide-react";

interface ProfileBadgesProps {
  streak?: number;
  level?: number;
  nextLevelProgress?: number;
  badges?: Array<{ id: string; name: string; description: string; earned: boolean }>;
}

export function ProfileBadges({ streak = 12, level = 4, nextLevelProgress = 72, badges = [] }: ProfileBadgesProps) {
  const badgeList = badges.length
    ? badges
    : [
        { id: "first-vote", name: "First Spark", description: "Cast your first vote", earned: true },
        { id: "local-voice", name: "Local Voice", description: "Top voice in your city", earned: true },
        { id: "trend-setter", name: "Trend Setter", description: "Share 3 stories", earned: false },
      ];

  return (
    <section className="rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-4 text-[#1f1b18] shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-maroon">Profile level</p>
          <h3 className="mt-1 text-lg font-semibold text-[#1f1b18]">Level {level}</h3>
        </div>
        <div className="rounded-2xl border border-maroon/20 bg-maroon/5 px-3 py-2 text-sm font-medium text-maroon">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4" /> {streak} day streak
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-3">
        <div className="mb-2 flex items-center justify-between text-sm text-[#625a50]">
          <span>Level progress</span>
          <span>{nextLevelProgress}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#d8ceb8]">
          <div className="h-full rounded-full bg-gradient-to-r from-maroon to-maroon/70" style={{ width: `${nextLevelProgress}%` }} />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {badgeList.map((badge) => (
          <div key={badge.id} className={`flex items-center justify-between rounded-2xl border px-3 py-3 ${badge.earned ? "border-emerald-500/20 bg-emerald-50" : "border-[#d8ceb8] bg-[#f4efe7]"}`}>
            <div className="flex items-center gap-2">
              {badge.earned ? <Trophy className="h-4 w-4 text-emerald-600" /> : <Sparkles className="h-4 w-4 text-[#625a50]" />}
              <div>
                <p className="text-sm font-medium text-[#1f1b18]">{badge.name}</p>
                <p className="text-xs text-[#625a50]">{badge.description}</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.earned ? "bg-emerald-100 text-emerald-700" : "bg-[#d8ceb8] text-[#625a50]"}`}>
              {badge.earned ? "Unlocked" : "Next"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
