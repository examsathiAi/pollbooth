import type { Metadata } from "next";
import { PollDetailClient } from "@/components/poll/PollDetailClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchPoll(pollId: string) {
  const res = await fetch(`${API_URL}/api/v1/polls/${pollId}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: { params: { guestPollId: string } }): Promise<Metadata> {
  const poll = await fetchPoll(params.guestPollId);
  if (!poll) {
    return {
      title: "Guest poll invite | Pulse",
      description: "Vote as a guest on Pulse and join the community conversation.",
    };
  }

  return {
    title: `Vote on: ${poll.question}`,
    description: `Guest voting invitation for Pulse poll: ${poll.question}`,
    openGraph: {
      title: `Vote on: ${poll.question}`,
      description: `Vote as a guest and see live results.`,
      type: "article",
      images: [`/api/og/poll/${params.guestPollId}`],
    },
  };
}

export default async function GuestPollPage({ params }: { params: { guestPollId: string } }) {
  const poll = await fetchPoll(params.guestPollId);

  if (!poll) {
    return <div className="min-h-screen bg-slate-50 p-8 text-center text-slate-600">This shared poll could not be loaded right now.</div>;
  }

  return <PollDetailClient pollId={params.guestPollId} initialPoll={poll} />;
}
