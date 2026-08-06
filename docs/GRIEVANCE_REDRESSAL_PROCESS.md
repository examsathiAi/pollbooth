# Pulse — Grievance Redressal Process (Internal Operating Document)

This document describes the actual internal process for handling grievances, complaints,
and data-rights requests, matching the commitments made in the Terms and Conditions and
Privacy Policy. It is intended for whoever operates the Pulse admin panel (currently: the
SUPER_ADMIN role), not for public users (they should be directed to the public-facing
contact details instead).

## 1. What counts as a grievance

- A complaint about specific content (an opinion, a poll, a civic report) that a user
  believes violates the Terms or the law.
- A complaint about a moderation decision (e.g., "my account was unfairly restricted").
- A data-rights request: access, correction, deletion, or consent withdrawal.
- Any other complaint about how the Platform or its users have treated someone.

## 2. Intake

- All grievances arrive via the Grievance Officer email address published in the Terms
  and Privacy Policy.
- Every grievance must be logged (even informally, e.g., a simple spreadsheet or the
  admin panel's audit log) with: date received, nature of complaint, complainant contact,
  and the content/account involved if applicable.

## 3. Response timeline

- **Acknowledge within 24 hours** of receipt (an automated or manual reply confirming
  receipt and expected resolution timeframe is sufficient).
- **Resolve or substantively respond within 15 days**, per the Information Technology
  Rules, 2021 and DPDP Act, 2023 expectations for grievance redressal.
- Data-rights requests specifically (access/correction/erasure) should be actioned as
  soon as reasonably possible and confirmed to the requester once complete.

## 4. Handling different grievance types

**Content complaint** (e.g., "this opinion is defamatory/hateful"):
1. Locate the content via the admin Moderation Queue.
2. Assess against the Community Guidelines / Terms Section 4.
3. If it violates: remove/hide the content, apply the standard escalation to the
   posting account (warning → temporary restriction → permanent, per existing
   moderation logic).
4. Respond to the complainant confirming the outcome (without necessarily disclosing
   internal account details of the other user).

**Moderation-decision appeal** (e.g., "my account was banned unfairly"):
1. Review the account's moderation history in the admin Users page.
2. If the original action was a mistake or disproportionate, reverse it.
3. If it was correct, explain the reason to the user in plain terms.

**Data-rights request** (access/correction/erasure/consent withdrawal):
1. Verify the requester's identity (matching the phone number on the account, at minimum).
2. For **access**: export the user's stored data (profile, votes, opinions - excluding
   other users' data) and provide it to them.
3. For **correction**: update the relevant field directly (profile fields can be edited
   via Prisma Studio or a future admin user-edit tool).
4. For **erasure**: deactivate/anonymize the account per the Privacy Policy's retention
   rules (Section 5) - this should scrub identifying fields while preserving aggregate
   vote counts where anonymization is sufficient, consistent with not breaking poll
   integrity for other users.
5. For **consent withdrawal**: update the user's consent record (see the `consent`
   module) to reflect withdrawal of the specific optional consent (e.g., research data
   sharing), and confirm to the user this has taken effect.

**Election/political content concern**:
- Any complaint suggesting a political poll may be running during a restricted period
  should be treated as urgent - verify against the Election Blackout admin panel
  immediately, since this carries specific legal exposure under election law.

## 5. Escalation

- Anything involving a genuine legal threat, a request from law enforcement, or a
  significant data breach should be escalated immediately to whoever holds ultimate
  responsibility for the Platform (not handled solely at the day-to-day admin level),
  and external legal counsel should be consulted before any substantive response is sent.

## 6. Recordkeeping

- Keep a simple log of all grievances and their resolution, including dates - this both
  supports the 15-day response commitment and provides a record if the Data Protection
  Board of India or another authority ever asks for evidence of your grievance process.
- This log itself is personal data about the complainants involved and should be handled
  with the same care as any other user data (limited access, not retained longer than
  necessary once resolved, per your own retention policy).

---

_This is an operational process document, not a legal document - it should be reviewed
and adjusted alongside the Terms and Conditions / Privacy Policy by a qualified advisor
before relying on it for a real launch._
