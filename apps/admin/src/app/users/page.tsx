"use client";

import Link from "next/link";
import { UserManagement } from "@/components/UserManagement";

export default function UsersPage() {
  return (
    <main className="min-h-screen bg-[#f4efe7] p-6 text-[#1f1b18]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-maroon">Admin</p>
            <h1 className="text-3xl font-semibold text-[#1f1b18]">Users</h1>
          </div>
          <Link href="/" className="rounded-2xl border border-[#d8ceb8] px-4 py-2.5 text-sm font-semibold text-[#1f1b18]">
            Back to dashboard
          </Link>
        </div>

        <UserManagement />
      </div>
    </main>
  );
}
