import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 bg-white px-4 py-10 text-slate-700 sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Terms of service</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Pulse is a respectful, consent-based community platform.</h1>
        <p className="mt-4 text-base leading-7">By using Pulse, you agree to participate constructively, avoid impersonation or abuse, and respect the rights of other users and the moderation rules of the platform.</p>
      </div>

      <section className="rounded-[28px] border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Platform rules</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7">
          <li>Do not post abusive, hateful, or unlawful content.</li>
          <li>Do not manipulate voting or referral activity with fake accounts or coordinated abuse.</li>
          <li>Respect moderation actions and platform safety decisions.</li>
          <li>Use the platform for civic, product, and community feedback in good faith.</li>
        </ul>
      </section>

      <section className="rounded-[28px] border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Rewards and referrals</h2>
        <p className="mt-3 text-sm leading-7">Referral credits and rewards are issued at the discretion of Pulse and may be subject to verification, fair-use review, and compliance checks. Misuse may result in reward reversal or account restrictions.</p>
      </section>

      <div className="text-sm text-slate-500">
        <Link href="/privacy" className="font-medium text-blue-600">View privacy policy</Link>
      </div>
    </main>
  );
}
