"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, AlertCircle, LayoutDashboard, LogOut, MessageSquareWarning, PencilRuler, ShieldCheck, Sparkles, Users } from "lucide-react";
import { CivicIssueReviewPanel } from "@/components/CivicIssueReviewPanel";
import { ElectionBlackoutPanel } from "@/components/ElectionBlackoutPanel";
import { ModerationQueue } from "@/components/ModerationQueue";
import { PlatformHealth } from "@/components/PlatformHealth";
import { PollCreationPanel } from "@/components/PollCreationPanel";
import { PollReviewQueue } from "@/components/PollReviewQueue";
import { RolesManagement } from "@/components/RolesManagement";
import { SurveyApprovals } from "@/components/SurveyApprovals";
import { TopicBalance } from "@/components/TopicBalance";
import { UserManagement } from "@/components/UserManagement";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, minimumRole: "MODERATOR" },
  { id: "polls", label: "Polls", icon: PencilRuler, minimumRole: "ADMIN" },
  { id: "moderation", label: "Moderation", icon: MessageSquareWarning, minimumRole: "MODERATOR" },
  { id: "users", label: "Users", icon: Users, minimumRole: "ADMIN" },
  { id: "surveys", label: "Surveys", icon: ShieldCheck, minimumRole: "ADMIN" },
  { id: "civic", label: "Civic", icon: AlertCircle, minimumRole: "MODERATOR" },
  { id: "roles", label: "Roles", icon: ShieldCheck, minimumRole: "SUPER_ADMIN" },
  { id: "health", label: "Health", icon: Activity, minimumRole: "SUPER_ADMIN" },
];

const ROLE_LEVELS: Record<string, number> = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export default function AdminPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState("overview");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("pulse_user_role") || null;
      const token = localStorage.getItem("pulse_token");
      setUserRole(storedRole);

      if (!token) {
        router.replace("/login");
      }
    }
  }, [router]);

  const canAccess = (minimumRole: string) => {
    const currentLevel = ROLE_LEVELS[userRole || "USER"] ?? 0;
    const requiredLevel = ROLE_LEVELS[minimumRole] ?? 0;
    return currentLevel >= requiredLevel;
  };

  const handleLogout = () => {
    localStorage.removeItem("pulse_token");
    localStorage.removeItem("pulse_user_role");
    router.replace("/login");
  };

  const handleNav = (view: string) => {
    if (view === "users") {
      router.push("/users");
      return;
    }
    setActiveView(view);
  };

  const renderView = () => {
    switch (activeView) {
      case "polls":
        return (
          <div className="space-y-6">
            <section className="rounded-[28px] border border-violet-500/20 bg-gradient-to-br from-violet-600/20 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">Review & publish</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Take a poll from draft to public feed in one flow</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">Create, review, approve, and publish polls without leaving the operations console.</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                  <div className="font-semibold text-white">Live review pipeline</div>
                  <div className="mt-1 text-slate-400">Approval queue + publication controls</div>
                </div>
              </div>
            </section>
            <PollCreationPanel />
            <PollReviewQueue />
            {userRole === "SUPER_ADMIN" ? <ElectionBlackoutPanel /> : null}
          </div>
        );
      case "civic":
        return <CivicIssueReviewPanel />;
      case "roles":
        return <RolesManagement />;
      case "health":
        return <PlatformHealth />;
      default:
        return (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <ModerationQueue />
              <TopicBalance />
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <UserManagement />
              <SurveyApprovals />
            </div>
          </div>
        );
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        <aside className="w-full shrink-0 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-black/20 lg:w-72">
          <div className="mb-8 rounded-[24px] border border-violet-500/30 bg-gradient-to-br from-violet-500/15 via-slate-900 to-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Pulse HQ</p>
            <h1 className="mt-2 text-xl font-semibold text-white">Operations Console</h1>
            <p className="mt-2 text-sm text-slate-400">Moderate, manage, and grow the platform like a live social newsroom.</p>
          </div>

          <nav className="space-y-2">
            {navItems.filter((item) => canAccess(item.minimumRole)).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${activeView === item.id ? "border-violet-500/40 bg-violet-500/10 text-white" : "border-transparent bg-slate-950/70 text-slate-300 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-white"}`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogOut className="h-5 w-5" /> Sign out
          </button>

          <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-200">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Live controls for polls, civic review, and election blackout windows.</span>
            </div>
          </div>
        </aside>

        <section className="flex-1 space-y-6">{renderView()}</section>
      </div>
    </main>
  );
}
