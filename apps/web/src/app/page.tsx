import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck, Sparkles, Users, Activity } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4efe7] text-[#1f1b18] selection:bg-[#e7d9cd]">
      <header className="border-b border-[#d8ceb8] bg-[#fffdf9]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[#7a1f10]">
            <Activity className="h-6 w-6" />
            PollBooth
          </div>
          <nav className="hidden gap-8 text-sm font-medium text-[#625a50] md:flex">
            <Link href="/about" className="transition hover:text-[#1f1b18]">About</Link>
            <Link href="/feed" className="transition hover:text-[#1f1b18]">Live Feed</Link>
            <Link href="/rewards" className="transition hover:text-[#1f1b18]">Rewards</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-[#625a50] transition hover:text-[#1f1b18]">Log in</Link>
            <Link href="/auth/login?mode=signup" className="rounded-full bg-[#7a1f10] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5c1709]">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 sm:pt-24 lg:px-8 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#d8ceb8] bg-[#f7f1e8] px-4 py-1.5 text-sm font-medium text-[#7a1f10]">
            <Sparkles className="h-4 w-4" /> The New Standard for Public Opinion
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-[#1f1b18] sm:text-7xl">
            Make every poll feel like a <span className="text-[#7a1f10]">live conversation.</span>
          </h1>
          <p className="mt-8 text-lg leading-8 text-[#625a50] sm:text-xl">
            PollBooth brings together voting, verified opinions, and community rewards in one lightning-fast, highly secure experience for the next generation of civic debate.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/feed" className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#7a1f10] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#5c1709] sm:w-auto">
              Explore Live Polls <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/rewards" className="flex w-full items-center justify-center rounded-full border border-[#d8ceb8] bg-[#fffdf9] px-6 py-3.5 text-sm font-semibold text-[#1f1b18] transition hover:bg-[#f7f1e8] sm:w-auto">
              View Creator Rewards
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="group relative overflow-hidden rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-8 shadow-sm transition hover:shadow-md">
            <div className="mb-6 inline-flex rounded-xl bg-[#f7f1e8] p-3 text-[#7a1f10]">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-[#1f1b18]">Real-Time Signal</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#625a50]">
              Powered by Redis WebSockets, watch votes and demographic shifts happen instantly without ever refreshing the page.
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-8 shadow-sm transition hover:shadow-md">
            <div className="mb-6 inline-flex rounded-xl bg-[#f2e7dc] p-3 text-[#7a1f10]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-[#1f1b18]">DPDP Compliant</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#625a50]">
              Enterprise-grade privacy by design. Strict age-gates, explicit consent flows, and anonymized cohort enforcement.
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-8 shadow-sm transition hover:shadow-md sm:col-span-2 lg:col-span-1">
            <div className="mb-6 inline-flex rounded-xl bg-[#f7f1e8] p-3 text-[#7a1f10]">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-[#1f1b18]">Verified Cohorts</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#625a50]">
              Say goodbye to bot farms. Rate-limited, one-vote-per-user architecture ensures the data reflects actual public sentiment.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
