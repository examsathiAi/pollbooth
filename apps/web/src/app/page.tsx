import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck, Sparkles, Users, Activity, Globe } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0A0F1C] text-slate-200 selection:bg-cyan-500/30">
      {/* Ambient Background Glow */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[500px] overflow-hidden opacity-30">
        <div className="absolute -top-[50%] left-[50%] w-[1000px] -translate-x-1/2 rounded-full bg-cyan-600/20 blur-[120px] pb-[1000px]" />
      </div>

      {/* Navigation Placeholder */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <div className="flex items-center gap-2 text-2xl font-bold tracking-tighter text-white">
          <Activity className="h-6 w-6 text-cyan-400" />
          PollBooth
        </div>
        <nav className="hidden gap-8 text-sm font-medium text-slate-400 md:flex">
          <Link href="/about" className="hover:text-white transition">About</Link>
          <Link href="/feed" className="hover:text-white transition">Live Feed</Link>
          <Link href="/rewards" className="hover:text-white transition">Rewards</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm font-medium hover:text-white transition">Log in</Link>
          <Link href="/auth/login?mode=signup" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200">
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 sm:pt-32 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-sm font-medium text-cyan-300 backdrop-blur-sm">
            <Sparkles className="h-4 w-4" /> The New Standard for Public Opinion
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
            Make every poll feel like a <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">live conversation.</span>
          </h1>
          <p className="mt-8 text-lg leading-8 text-slate-400 sm:text-xl">
            PollBooth brings together voting, verified opinions, and community rewards in one lightning-fast, highly secure experience for the next generation of civic debate.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/feed" className="group flex w-full items-center justify-center gap-2 rounded-full bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 sm:w-auto">
              Explore Live Polls <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/rewards" className="flex w-full items-center justify-center rounded-full border border-slate-700 bg-slate-800/50 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-slate-600 hover:bg-slate-800 sm:w-auto">
              View Creator Rewards
            </Link>
          </div>
        </div>
      </section>

      {/* Enterprise Bento Grid */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 */}
          <div className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 hover:bg-slate-900 transition">
            <div className="mb-6 inline-flex rounded-xl bg-blue-500/10 p-3 text-blue-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Real-Time Signal</h3>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Powered by Redis WebSockets, watch votes and demographic shifts happen instantly without ever refreshing the page.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 hover:bg-slate-900 transition">
            <div className="mb-6 inline-flex rounded-xl bg-teal-500/10 p-3 text-teal-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">DPDP Compliant</h3>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Enterprise-grade privacy by design. Strict age-gates, explicit consent flows, and anonymized cohort enforcement.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 hover:bg-slate-900 transition sm:col-span-2 lg:col-span-1">
            <div className="mb-6 inline-flex rounded-xl bg-purple-500/10 p-3 text-purple-400">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Verified Cohorts</h3>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Say goodbye to bot farms. Rate-limited, one-vote-per-user architecture ensures the data reflects actual public sentiment.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
