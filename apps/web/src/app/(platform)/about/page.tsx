import Link from "next/link";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pollbooth.in";
const TITLE = "About PollBooth: India's opinion polling platform";
const SUMMARY =
  "PollBooth is an India-first public opinion polling platform. Anyone can vote on questions about politics, civic issues, the economy, sports, Bollywood, technology and everyday life, see how the country is voting in real time, and join the discussion.";
const DESCRIPTION =
  "PollBooth is an India-first polling platform. Vote on politics, civic issues, sports, Bollywood and more, see live results, and join the discussion.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/about`, type: "website", images: ["/og-card.png"] },
};

type Section = { id: string; heading: string; paras: string[]; items?: string[] };

const SECTIONS: Section[] = [
  {
    id: "what-is-pollbooth",
    heading: "What is PollBooth?",
    paras: [
      "PollBooth is a website where India votes on the questions people are actually talking about. Each poll is short, written in plain English with a little Hinglish, and works on any phone.",
      "Results update live as people vote, so you can see how opinion is moving while a topic is still in the news.",
    ],
  },
  {
    id: "how-it-works",
    heading: "How PollBooth works",
    paras: ["Taking part takes less than a minute."],
    items: [
      "Pick a poll from the home page or the feed, or search for a topic you care about.",
      "Vote with one tap. You can vote as a guest without creating an account.",
      "Sign in with a one-time code sent to your email, or with Google, to comment on polls and keep your activity under one account.",
      "Share the poll with friends and watch the numbers move.",
    ],
  },
  {
    id: "topics",
    heading: "What you can vote on",
    paras: [
      "Polls cover politics, civic issues, current events, local news, the economy, education, health, technology, startups, work culture, sports, Bollywood, food, travel, fashion, auto, real estate, the environment and social questions.",
    ],
  },
  {
    id: "trust",
    heading: "How we keep results trustworthy",
    paras: [],
    items: [
      "Each poll accepts one vote per person. Signed-in votes are tied to an account, and guest votes are tied to a device session.",
      "Sign-in uses one-time codes and rate limits to slow down spam and automated voting.",
      "Sponsored polls are always clearly labelled as Sponsored.",
      "Results show the views of people who chose to vote on PollBooth. They are a snapshot of public mood, not a scientific survey of all of India.",
    ],
  },
  {
    id: "privacy",
    heading: "Privacy and your data",
    paras: [
      "PollBooth is built with India's Digital Personal Data Protection Act in mind. We ask for your consent when you sign up, we keep user IDs out of shareable links, and poll results are shown as aggregates rather than as individual votes.",
    ],
  },
  {
    id: "for-brands",
    heading: "For brands, media and researchers",
    paras: [
      "Brands and media teams can run sponsored polls to ask India a question and receive aggregated, anonymised results. Sponsored polls are always labelled, so readers know what they are voting on and who asked.",
      "To discuss a sponsored poll, use the contact page linked below.",
    ],
  },
];

const FAQ = [
  { q: "What is PollBooth?", a: "PollBooth is an India-first public opinion polling platform where anyone can vote on topical questions, see live results and discuss them." },
  { q: "Is PollBooth free to use?", a: "Yes. Voting and reading results are free." },
  { q: "Do I need an account to vote?", a: "No. You can vote as a guest. You need to sign in with an email code or Google to comment on polls." },
  { q: "How does PollBooth prevent fake votes?", a: "Each poll accepts one vote per account or device session, sign-in uses one-time codes, and requests are rate limited. No online poll can be perfect, which is why results are presented as a snapshot of public mood." },
  { q: "Are PollBooth results a scientific survey?", a: "No. Results reflect people who chose to vote on PollBooth and should not be read as a representative sample of the whole country." },
  { q: "Which languages does PollBooth use?", a: "Polls are written in English, with a little Hinglish where it makes the question feel natural." },
  { q: "How can a brand or media team run a poll?", a: "Brands and media teams can reach us through the contact page to discuss sponsored polls. Sponsored polls are always labelled." },
];

const LINKS = [
  { href: "/", label: "See live polls" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/grievance", label: "Contact and grievance" },
];

export default function AboutPage() {
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "PollBooth",
        url: SITE_URL,
        logo: `${SITE_URL}/pollbooth-logo.png`,
        description: SUMMARY,
      },
      {
        "@type": "AboutPage",
        "@id": `${SITE_URL}/about#page`,
        url: `${SITE_URL}/about`,
        name: TITLE,
        about: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  }).replace(/</g, "\\u003c");

  return (
    <main className="w-full bg-[#f4efe7] px-4 pb-20 pt-8 text-[#1f1b18] sm:px-6 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <article className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl" style={{ fontFamily: "var(--font-headline)" }}>
          About PollBooth
        </h1>
        <p className="mt-4 text-lg leading-8 text-[#3a342e]">{SUMMARY}</p>

        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="mt-10">
            <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-headline)" }}>{s.heading}</h2>
            {s.paras.map((p) => (
              <p key={p} className="mt-3 text-base leading-7 text-[#625a50]">{p}</p>
            ))}
            {s.items && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-[#625a50]">
                {s.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section id="faq" className="mt-12">
          <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-headline)" }}>Frequently asked questions</h2>
          {FAQ.map((f) => (
            <div key={f.q} className="mt-5">
              <h3 className="text-base font-semibold">{f.q}</h3>
              <p className="mt-1 text-base leading-7 text-[#625a50]">{f.a}</p>
            </div>
          ))}
        </section>

        <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#d8ceb8] pt-6 text-sm font-semibold text-[#7a1f10]">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">{l.label}</Link>
          ))}
        </nav>
      </article>
    </main>
  );
}
