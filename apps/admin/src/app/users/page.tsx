"use client";

import Link from "next/link";
import { UserManagement } from "@/components/UserManagement";

export default function UsersPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-violet-400">Admin</p>
            <h1 className="text-3xl font-semibold">Users</h1>
          </div>
          <Link href="/" className="rounded-2xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200">
            Back to dashboard
          </Link>
        </div>

        <UserManagement />
      </div>
    </main>
  );
}
