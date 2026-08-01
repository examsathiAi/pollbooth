import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck, Sparkles, Users } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-300">
              <Sparkles className="h-4 w-4" /> Pulse for real public opinion
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
              Make every public poll feel like a live conversation.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Pulse brings together voting, opinions, referrals, and community rewards in one fast, trusted experience for India’s next generation of civic and culture conversations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/feed" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
                Explore live polls <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/rewards" className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400 hover:text-cyan-300">
                View rewards
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
            <div className="rounded-[24px] border border-slate-800 bg-slate-950 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                <BarChart3 className="h-4 w-4 text-cyan-300" /> Live signal
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">Voted this week</p>
                  <p className="mt-2 text-3xl font-semibold text-white">1.2M+</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">Referrals powered</p>
                  <p className="mt-2 text-3xl font-semibold text-white">24K+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-slate-900/60">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-6">
            <Users className="h-6 w-6 text-cyan-300" />
            <h2 className="mt-4 text-xl font-semibold text-white">Community-led debate</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">Let users vote, add opinions, and share stories in a fast social-first flow.</p>
          </div>
          <div className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-6">
            <ShieldCheck className="h-6 w-6 text-cyan-300" />
            <h2 className="mt-4 text-xl font-semibold text-white">Consent-first privacy</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">Public features are built around explicit consent, privacy-by-design, and transparent controls.</p>
          </div>
          <div className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-6">
            <Sparkles className="h-6 w-6 text-cyan-300" />
            <h2 className="mt-4 text-xl font-semibold text-white">Viral sharing</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">Turn every strong poll into a referral moment with share links, rewards, and social proof.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
