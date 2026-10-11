import Link from "next/link";
import { GrievanceForm } from "./GrievanceForm";

export default function GrievancePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 bg-[#f4efe7] px-4 py-10 text-[#625a50] sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-[#d8ceb8] bg-[#fffdf9] p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a1f10]">Grievance & data requests</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#1f1b18]">Report a concern or request your data</h1>
        <p className="mt-4 text-base leading-7">PollBooth is committed to responding to legal, privacy, and safety concerns transparently. Use this page to submit a grievance, withdraw consent, or request access, correction or deletion of your data.</p>
      </div>

      <section className="rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1f1b18]">Submit a request</h2>
        <p className="mt-2 mb-5 text-sm leading-7">Fill in the form and you will get a reference number straight away. We aim to acknowledge every request within 24 hours and to resolve it within 15 days.</p>
        <GrievanceForm />
      </section>

      <section className="rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1f1b18]">Our grievance officer</h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-[#625a50]">
          <p>Designated Grievance Officer: <span className="font-medium text-[#1f1b18]">PollBooth Compliance Team</span></p>
          <p>Email: <a href="mailto:support@pollbooth.in" className="font-medium text-[#7a1f10]">support@pollbooth.in</a></p>
          <p>Phone: <a href="tel:+917004314471" className="font-medium text-[#7a1f10]">+91 70043 14471</a></p>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1f1b18]">What you can request</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7">
          <li>Access to the personal data stored about you</li>
          <li>Correction of inaccurate or incomplete data</li>
          <li>Withdrawal of consent for analytics or communications</li>
          <li>Deletion of your account and associated opinions, votes, and profile data where permitted</li>
        </ul>
      </section>

      <div className="flex flex-col gap-2 text-sm text-[#625a50]">
        <Link href="/privacy" className="font-medium text-[#7a1f10]">Back to Privacy Policy</Link>
        <Link href="/terms" className="font-medium text-[#7a1f10]">Back to Terms of Service</Link>
      </div>
    </main>
  );
}
