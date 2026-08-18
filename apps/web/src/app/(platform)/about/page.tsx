import Link from "next/link";
import { Activity, Shield, Users, Zap } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="w-full bg-[#f4efe7] pb-24 text-[#1f1b18]">
      <header className="border-b border-[#d8ceb8] bg-[#fffdf9]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#1f1b18]">
            <Activity className="h-5 w-5 text-[#7a1f10]" /> PollBooth
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-[#625a50] transition hover:text-[#1f1b18]">Log in</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 pt-24 text-center sm:pt-32 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1f1b18] sm:text-5xl">
          The heartbeat of public opinion.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#625a50]">
          We built PollBooth because we believe civic debate should be fast, transparent, and strictly verified. No bots. No noise. Just real cohorts driving real insights.
        </p>
      </div>

      <div className="mx-auto mt-24 max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-4 rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7a1f10] text-white">
              <Zap className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-[#1f1b18]">Built for Speed</h2>
            <p className="text-[#625a50]">Our real-time WebSocket architecture ensures you see shifts in public sentiment the millisecond they happen.</p>
          </div>
          <div className="flex flex-col gap-4 rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7a1f10] text-white">
              <Shield className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-[#1f1b18]">Privacy by Design</h2>
            <p className="text-[#625a50]">Fully compliant with the DPDP Act. We strictly enforce minimum cohort sizes to guarantee user anonymity at scale.</p>
          </div>
          <div className="flex flex-col gap-4 rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7a1f10] text-white">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-[#1f1b18]">Verified Voices</h2>
            <p className="text-[#625a50]">A strict one-vote-per-user system combined with OTP-verified phone numbers ensures bot-free integrity.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
