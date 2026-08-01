"use client";

import { LayoutDashboard, MessageSquareWarning, ShieldCheck, Users } from "lucide-react";
import { ModerationQueue } from "@/components/ModerationQueue";
import { TopicBalance } from "@/components/TopicBalance";
import { UserManagement } from "@/components/UserManagement";
import { SurveyApprovals } from "@/components/SurveyApprovals";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "moderation", label: "Moderation", icon: MessageSquareWarning },
  { id: "users", label: "Users", icon: Users },
  { id: "surveys", label: "Surveys", icon: ShieldCheck },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        <aside className="w-full shrink-0 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-black/20 lg:w-72">
          <div className="mb-8 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Pulse Admin</p>
            <h1 className="mt-2 text-xl font-semibold text-white">Operations Console</h1>
            <p className="mt-2 text-sm text-slate-400">Moderate, manage, and grow the platform.</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-slate-950/70 px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-white">
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="flex-1 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <ModerationQueue />
            <TopicBalance />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <UserManagement />
            <SurveyApprovals />
          </div>
        </section>
      </div>
    </main>
  );
}
