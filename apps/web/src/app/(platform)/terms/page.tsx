import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 bg-[#f4efe7] px-4 py-10 text-[#625a50] sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-[#d8ceb8] bg-[#fffdf9] p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a1f10]">Terms of service</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#1f1b18]">PollBooth is a respectful, consent-based community platform.</h1>
        <p className="mt-4 text-base leading-7">By using PollBooth, you agree to participate constructively, avoid impersonation or abuse, and respect the rights of other users and the moderation rules of the platform.</p>
      </div>

      <section className="rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1f1b18]">Platform rules</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7">
          <li>Do not post abusive, hateful, or unlawful content.</li>
          <li>Do not manipulate voting or referral activity with fake accounts or coordinated abuse.</li>
          <li>Respect moderation actions and platform safety decisions.</li>
          <li>Use the platform for civic, product, and community feedback in good faith.</li>
        </ul>
      </section>

      <section className="rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1f1b18]">Rewards and referrals</h2>
        <p className="mt-3 text-sm leading-7">Referral credits and rewards are issued at the discretion of PollBooth and may be subject to verification, fair-use review, and compliance checks. Misuse may result in reward reversal or account restrictions.</p>
      </section>

      <section className="rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1f1b18]">Dispute and grievance</h2>
        <p className="mt-3 text-sm leading-7">If you have a legal concern, abuse report, or data request, use the grievance page so we can respond quickly and transparently.</p>
      </section>

      <div className="flex flex-col gap-2 text-sm text-[#625a50]">
        <Link href="/privacy" className="font-medium text-[#7a1f10]">View privacy policy</Link>
        <Link href="/grievance" className="font-medium text-[#7a1f10]">Grievance officer and data request</Link>
      </div>
    </main>
  );
}
