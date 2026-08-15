import Link from "next/link";

export default function GrievancePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 bg-white px-4 py-10 text-slate-700 sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Grievance & data requests</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Report a concern or request your data</h1>
        <p className="mt-4 text-base leading-7">PollBooth is committed to responding to legal, privacy, and safety concerns transparently. Use this page to submit a grievance, withdraw consent, or request access or deletion of your data.</p>
      </div>

      <section className="rounded-[28px] border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">How to contact our grievance officer</h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
          <p>Designated Grievance Officer: <span className="font-medium text-slate-900">PollBooth Compliance Team</span></p>
          <p>Email: <a href="mailto:privacy@pollboothapp.in" className="font-medium text-blue-600">privacy@pollboothapp.in</a></p>
          <p>Response time: We aim to acknowledge your request within 3 business days and resolve it as soon as possible.</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">What you can request</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7">
          <li>Access to the personal data stored about you</li>
          <li>Correction of inaccurate or incomplete data</li>
          <li>Withdrawal of consent for analytics or communications</li>
          <li>Deletion of your account and associated opinions, votes, and profile data where permitted</li>
        </ul>
      </section>

      <section className="rounded-[28px] border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Submit a request</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">Please send your request from the phone number or email linked to your PollBooth account, or include your account ID if you are already signed in. If you are unable to access your account, email us with the same phone number used for signup.</p>
        <div className="mt-6 space-y-4 text-sm leading-7">
          <p className="font-semibold text-slate-900">Suggested request format:</p>
          <div className="rounded-2xl border border-slate-200 bg-slate-950/5 p-4 text-slate-700">
            <p><span className="font-medium">Subject:</span> Data access request / Account deletion request</p>
            <p className="mt-2">Hi PollBooth team,</p>
            <p className="mt-2">I would like to request access to / correction of / deletion of my account-linked data. My phone number is +91XXXXXXXXXX.</p>
            <p className="mt-2">Thank you,</p>
            <p>Your name</p>
          </div>
        </div>
      </section>

      <div className="text-sm text-slate-500 flex flex-col gap-2">
        <Link href="/privacy" className="font-medium text-blue-600">Back to Privacy Policy</Link>
        <Link href="/terms" className="font-medium text-blue-600">Back to Terms of Service</Link>
      </div>
    </main>
  );
}
