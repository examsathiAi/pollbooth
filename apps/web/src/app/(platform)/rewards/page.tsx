"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Gift, Share2, Sparkles, Trophy } from "lucide-react";

export default function RewardsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/v1/users/profile");
        setProfile(res.data);
      } catch {
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const referralCount = profile?.stats?.total_votes ?? 0;
  const credits = Math.max(0, referralCount * 25);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 bg-slate-50 px-4 py-6 text-slate-700 sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">
          <Gift className="h-4 w-4" /> Rewards wallet
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Your referral engine is live.</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Track your invites, viral shares, and the credits youâ€™ve earned for bringing new voices into PollBooth.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Referral count</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{isLoading ? "â€”" : referralCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Earned credits</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{isLoading ? "â€”" : `${credits} pts`}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Status</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{credits >= 100 ? "Eligible" : "Growing"}</p>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-blue-600 to-cyan-500 p-6 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">
          <Sparkles className="h-4 w-4" /> Viral share links
        </div>
        <p className="mt-3 text-sm leading-7 text-blue-50">Share your favorite poll with WhatsApp or Telegram and keep the loop moving with a referral parameter attached.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="https://wa.me/?text=Join%20PollBooth%20and%20vote%20with%20me%3A%20https%3A//pollbooth.app%2Ffeed%3Fref%3Dyou" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
            <Share2 className="h-4 w-4" /> WhatsApp
          </a>
          <a href="https://t.me/share/url?url=https%3A//pollbooth.app%2Ffeed%3Fref%3Dyou&text=Join%20PollBooth%20and%20vote%20with%20me" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
            <Share2 className="h-4 w-4" /> Telegram
          </a>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          <Trophy className="h-4 w-4" /> Whatâ€™s next
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
          <li>Invite friends to vote and grow your referral count.</li>
          <li>Unlock higher reward tiers as your network grows.</li>
          <li>Earn status badges for consistent participation and shared polls.</li>
        </ul>
      </section>
    </main>
  );
}
