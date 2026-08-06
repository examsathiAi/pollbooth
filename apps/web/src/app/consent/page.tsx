import Link from "next/link";

export default function ConsentPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-600">Data privacy</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Manage your consent preferences</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Pulse is built to respect your choices. This page explains how your data is used and how you can withdraw optional consent whenever you want.
          </p>
        </div>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">What you can control</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-slate-600">
            <li>Sign-up consent for Terms, Privacy, and minimum age verification.</li>
            <li>Optional analytics and product improvement tracking.</li>
            <li>How your profile and referral data are used in the Pulse experience.</li>
            <li>How to request data access, correction, or deletion.</li>
          </ul>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Withdraw optional consent</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            If you no longer want to share analytics data, simply uncheck the analytics consent checkbox during signup or contact support through the grievance page. Essential auth and voting data remain needed to keep your account working.
          </p>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-700">
          <p className="font-semibold text-slate-900">Need help with a data request?</p>
          <p className="mt-3">Visit the grievance page to request access, correction, or deletion of your Pulse account data.</p>
          <Link href="/grievance" className="mt-4 inline-flex rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Go to grievance page
          </Link>
        </section>
      </div>
    </main>
  );
}
