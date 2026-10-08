import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, User } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pollbooth.in";
const SHOW_STATS_FROM_VOTES = 500;

export const revalidate = 60;

const TITLE = "PollBooth: Vote on what India is talking about";
const DESCRIPTION =
  "Vote in live polls on politics, sports, Bollywood, food and more. See how India votes in real time and join the discussion. Free, and no sign-in needed to vote.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "PollBooth",
    type: "website",
    locale: "en_IN",
    images: [{ url: "/og-card.png", width: 1200, height: 630, alt: "PollBooth: what does India think?" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-card.png"] },
};

type HomePoll = {
  id: string;
  question: string;
  category?: string;
  options?: unknown[];
  image_url?: string | null;
  total_votes?: number;
  status?: string;
  is_active?: boolean;
  end_date?: string | null;
  is_commercial?: boolean;
};
type Stats = { totals: { users: number; polls: number; votes: number } };

const TOPICS = ["Politics", "News", "Sports", "Bollywood", "Tech", "Economy", "Civic", "Local", "Food", "Travel", "Health", "Education", "Startups", "Fashion", "Auto", "Environment"];

const STEPS = [
  { n: "1", title: "Vote in one tap", body: "Pick an option on any poll. You do not need to sign in to vote." },
  { n: "2", title: "See how India voted", body: "Results appear the moment you vote and keep updating as more people join." },
  { n: "3", title: "Join the discussion", body: "Create a free account to comment and react. Vote first, then add your view." },
];

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(API_URL + path, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function isOpen(p: HomePoll) {
  if (p.status === "CLOSED" || p.is_active === false) return false;
  if (p.end_date && new Date(p.end_date).getTime() < Date.now()) return false;
  return true;
}

function optionLabels(p: HomePoll): string[] {
  return (p.options || [])
    .slice(0, 4)
    .map((o: any) => (typeof o === "string" ? o : String(o?.text ?? o?.option ?? o?.label ?? "")))
    .filter(Boolean);
}

const fmt = (n: number) => n.toLocaleString("en-IN");

function votesText(n: number) {
  if (n <= 0) return "Be the first to vote";
  return fmt(n) + (n === 1 ? " vote" : " votes");
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#d8ceb8] bg-[#f4efe7]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="PollBooth home" className="inline-flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pollbooth-mark.png" alt="" className="h-9 w-auto" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pollbooth-wordmark.png" alt="PollBooth" className="h-[20px] w-auto sm:h-6" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#625a50] md:flex" aria-label="Main">
          <Link href="/feed" className="transition hover:text-[#1f1b18]">Live polls</Link>
          <a href="#how-it-works" className="transition hover:text-[#1f1b18]">How it works</a>
          <Link href="/about" className="transition hover:text-[#1f1b18]">About</Link>
        </nav>
        <div className="flex items-center gap-1">
          <Link href="/auth/login?mode=login" aria-label="Log in or sign up" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7a1f10] text-white transition hover:bg-[#5c1709] sm:hidden">
            <User className="h-[18px] w-[18px]" />
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            <Link href="/auth/login?mode=login" className="rounded-full px-3 py-1.5 text-sm font-medium text-[#1f1b18] transition hover:bg-black/5">Log in</Link>
            <Link href="/auth/login?mode=signup" className="rounded-full bg-[#7a1f10] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#5c1709]">Sign up</Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 text-center sm:px-6 sm:pb-14 sm:pt-16">
      <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#d8ceb8] bg-[#fffdf9] px-3.5 py-1 text-[13px] font-medium text-[#7a1f10]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Live polls, updated as India votes
      </p>
      <h1
        style={{ fontFamily: "var(--font-headline), Georgia, serif" }}
        className="mx-auto max-w-3xl text-[34px] font-bold leading-[1.1] tracking-tight text-[#1f1b18] sm:text-6xl"
      >
        Vote on what India is <span className="text-[#7a1f10]">talking about.</span>
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#625a50] sm:text-lg">
        Politics, sports, Bollywood, food and more. Cast your vote in one tap, see how India voted, and join the discussion. Aapka vote, India ka mood.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/feed" className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7a1f10] px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#5c1709] sm:w-auto">
          Vote now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link href="/auth/login?mode=signup" className="inline-flex w-full items-center justify-center rounded-full border border-[#d8ceb8] bg-[#fffdf9] px-7 py-3.5 text-[15px] font-semibold text-[#1f1b18] transition hover:bg-[#f7f1e8] sm:w-auto">
          Create free account
        </Link>
      </div>
      <p className="mt-4 text-[13px] text-[#8a8174]">Free to use. One vote per person. No sign-in needed to vote.</p>
    </section>
  );
}

function LivePolls({ polls }: { polls: HomePoll[] }) {
  if (polls.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6" aria-labelledby="live-heading">
      <div className="mb-4 flex items-end justify-between">
        <h2 id="live-heading" className="text-xl font-semibold text-[#1f1b18] sm:text-2xl">Live right now</h2>
        <Link href="/feed" className="text-sm font-semibold text-[#7a1f10] hover:underline">See all polls</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {polls.map((p) => (
          <Link
            key={p.id}
            href={"/poll/" + p.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-[#d8ceb8] bg-[#fffdf9] text-left transition hover:border-[#7a1f10]/40 hover:shadow-md"
          >
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt="" loading="lazy" className="aspect-[1200/630] w-full bg-[#f0e9db] object-cover" />
            ) : null}
            <div className="flex flex-1 flex-col p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8174]">
                {(p.category || "").replace(/_/g, " ")}{p.is_commercial ? " · Sponsored" : ""}
              </p>
              <h3 className="mt-1.5 text-[17px] font-semibold leading-snug text-[#1f1b18]">{p.question}</h3>
              <ul className="mt-3 space-y-1.5">
                {optionLabels(p).map((o) => (
                  <li key={o} className="rounded-lg border border-[#e6dcc8] bg-[#f7f1e8] px-3 py-2 text-sm text-[#3d352d]">{o}</li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between pt-4 text-sm">
                <span className="text-[#8a8174]">{votesText(p.total_votes || 0)}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#7a1f10]">
                  Vote <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StatsStrip({ stats }: { stats: Stats | null }) {
  if (!stats || !stats.totals || stats.totals.votes < SHOW_STATS_FROM_VOTES) return null;
  const items: Array<[string, number]> = [
    ["Votes cast", stats.totals.votes],
    ["Polls", stats.totals.polls],
    ["Members", stats.totals.users],
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6" aria-label="PollBooth in numbers">
      <dl className="grid grid-cols-3 divide-x divide-[#d8ceb8] rounded-2xl border border-[#d8ceb8] bg-[#fffdf9] py-5 text-center">
        {items.map(([label, value]) => (
          <div key={label} className="flex flex-col-reverse">
            <dt className="mt-1 text-xs text-[#8a8174] sm:text-sm">{label}</dt>
            <dd className="text-2xl font-bold text-[#1f1b18] sm:text-3xl">{fmt(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Topics() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6" aria-labelledby="topics-heading">
      <h2 id="topics-heading" className="text-xl font-semibold text-[#1f1b18] sm:text-2xl">Polls on what you care about</h2>
      <p className="mt-1 text-sm text-[#625a50]">Browse by topic once you are in the feed.</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <li key={t} className="rounded-full border border-[#d8ceb8] bg-[#fffdf9] px-3.5 py-1.5 text-sm font-medium text-[#3d352d]">{t}</li>
        ))}
      </ul>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-12 sm:px-6" aria-labelledby="how-heading">
      <h2 id="how-heading" className="text-xl font-semibold text-[#1f1b18] sm:text-2xl">How it works</h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="rounded-2xl border border-[#d8ceb8] bg-[#fffdf9] p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2e7dc] text-sm font-bold text-[#7a1f10]">{s.n}</span>
            <h3 className="mt-3 text-[17px] font-semibold text-[#1f1b18]">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-[#625a50]">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ForBrands() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6" aria-labelledby="brands-heading">
      <div className="rounded-3xl bg-[#7a1f10] px-6 py-10 text-center sm:px-12 sm:py-14">
        <h2 id="brands-heading" className="text-2xl font-semibold text-white sm:text-3xl">Want to know what India thinks?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-7 text-[#f1dfd6]">
          Run a sponsored poll or request audience insights built from live, anonymised votes. For brands, media houses, researchers and civic groups.
        </p>
        <Link href="/grievance" className="mt-6 inline-flex items-center justify-center rounded-full bg-[#fffdf9] px-6 py-3 text-[15px] font-semibold text-[#7a1f10] transition hover:bg-white">
          Get in touch
        </Link>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 text-center sm:px-6">
      <h2 style={{ fontFamily: "var(--font-headline), Georgia, serif" }} className="text-2xl font-bold text-[#1f1b18] sm:text-4xl">
        Aapka vote, India ka mood.
      </h2>
      <Link href="/feed" className="group mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#7a1f10] px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#5c1709]">
        Vote now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#d8ceb8] bg-[#f4efe7]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[#625a50] sm:flex-row sm:px-6">
        <p>&copy; {new Date().getFullYear()} PollBooth. All rights reserved.</p>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Footer">
          <Link href="/feed" className="hover:text-[#1f1b18]">Live polls</Link>
          <Link href="/about" className="hover:text-[#1f1b18]">About</Link>
          <Link href="/privacy" className="hover:text-[#1f1b18]">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#1f1b18]">Terms of Service</Link>
          <Link href="/grievance" className="hover:text-[#1f1b18]">Contact &amp; Grievance</Link>
        </nav>
      </div>
    </footer>
  );
}

export default async function HomePage() {
  const [feed, stats] = await Promise.all([
    getJson<{ polls?: HomePoll[] }>("/api/v1/polls/feed?page=1&limit=12"),
    getJson<Stats>("/api/v1/feed/stats"),
  ]);
  const live = (feed?.polls || [])
    .filter(isOpen)
    .sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0))
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "PollBooth", url: SITE_URL, logo: SITE_URL + "/pollbooth-logo.png" },
      { "@type": "WebSite", name: "PollBooth", url: SITE_URL, inLanguage: "en-IN" },
    ],
  };

  return (
    <div className="min-h-screen bg-[#f4efe7] text-[#1f1b18] selection:bg-[#e7d9cd]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main>
        <Hero />
        <LivePolls polls={live} />
        <StatsStrip stats={stats} />
        <Topics />
        <HowItWorks />
        <ForBrands />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
