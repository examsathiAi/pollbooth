import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 bg-[#f4efe7] px-4 py-10 text-[#625a50] sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-[#d8ceb8] bg-[#fffdf9] p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a1f10]">Privacy policy</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#1f1b18]">PollBooth respects consent, privacy, and user control.</h1>
        <p className="mt-4 text-base leading-7">PollBooth collects only the minimum data needed to run polls, opinions, referrals, and rewards responsibly. We do not sell personal data and we do not use your phone number for unrelated marketing.</p>
      </div>

      <section className="rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1f1b18]">India DPDP Act alignment</h2>
        <div className="mt-4 space-y-4 text-sm leading-7">
          <div>
            <h3 className="font-semibold text-[#1f1b18]">Data localization</h3>
            <p>Personal data is stored in controlled systems and processed in accordance with our operational safeguards. We keep the platform architecture aligned with the principle that sensitive data is processed only where necessary and protected by access controls.</p>
          </div>
          <div>
            <h3 className="font-semibold text-[#1f1b18]">Explicit consent gating</h3>
            <p>We only process profile data and referral-related data when a user explicitly engages with the relevant feature. Consent is captured through the product flow and can be withdrawn at any time.</p>
          </div>
          <div>
            <h3 className="font-semibold text-[#1f1b18]">Right to erase</h3>
            <p>Users can request deletion or account closure at any time. Upon request, we will remove account-linked data where legally permitted and retain only minimal records as required for compliance, safety, or audit purposes.</p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1f1b18]">What we collect</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7">
          <li>Phone number for authentication</li>
          <li>Basic profile and demographic fields when you choose to complete them</li>
          <li>Votes, opinions, and consent records necessary for the product experience</li>
          <li>Referral and reward activity for platform credits and viral campaigns</li>
        </ul>
      </section>

      <section className="rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1f1b18]">Your rights</h2>
        <p className="mt-4 text-sm leading-7">You may withdraw your consent at any time, request access to the data we hold about you, or ask for deletion of your account-linked information. Submit a grievance request through the grievance page to start the process.</p>
      </section>

      <div className="flex flex-col gap-2 text-sm text-[#625a50]">
        <Link href="/consent" className="font-medium text-[#7a1f10]">Manage your consent preferences</Link>
        <Link href="/terms" className="font-medium text-[#7a1f10]">View terms of service</Link>
        <Link href="/grievance" className="font-medium text-[#7a1f10]">Grievance officer and data request</Link>
      </div>
    </main>
  );
}
