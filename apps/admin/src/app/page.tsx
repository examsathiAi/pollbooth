"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, AlertCircle, LayoutDashboard, LogOut, MessageSquareWarning, PencilRuler, ShieldCheck, Users } from "lucide-react";
import { CivicIssueReviewPanel } from "@/components/CivicIssueReviewPanel";
import { ElectionBlackoutPanel } from "@/components/ElectionBlackoutPanel";
import { ModerationQueue } from "@/components/ModerationQueue";
import { PlatformHealth } from "@/components/PlatformHealth";
import { PollCreationPanel } from "@/components/PollCreationPanel";
import { PollReviewQueue } from "@/components/PollReviewQueue";
import { RolesManagement } from "@/components/RolesManagement";
import { SurveysDashboard } from "@/components/SurveysDashboard";
import { TopicBalance } from "@/components/TopicBalance";
import { UserManagement } from "@/components/UserManagement";
import { ExecutiveOverview } from "@/components/ExecutiveOverview";

const navItems = [
  { id: "overview", label: "Executive Overview", icon: LayoutDashboard, minimumRole: "MODERATOR" },
  { id: "polls", label: "Content Publisher", icon: PencilRuler, minimumRole: "ADMIN" },
  { id: "surveys", label: "B2B Campaigns", icon: ShieldCheck, minimumRole: "ADMIN" },
  { id: "moderation", label: "Moderation Hub", icon: MessageSquareWarning, minimumRole: "MODERATOR" },
  { id: "users", label: "Data Quality & Users", icon: Users, minimumRole: "ADMIN" },
  { id: "civic", label: "Civic Review", icon: AlertCircle, minimumRole: "MODERATOR" },
  { id: "roles", label: "Access & Roles", icon: ShieldCheck, minimumRole: "SUPER_ADMIN" },
  { id: "health", label: "System Health", icon: Activity, minimumRole: "SUPER_ADMIN" },
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

  const renderView = () => {
    switch (activeView) {
      case "overview": return <ExecutiveOverview />;
      case "surveys": return <SurveysDashboard />;
      case "polls": return (
        <div className="space-y-6">
          <PollCreationPanel />
          <PollReviewQueue />
          {userRole === "SUPER_ADMIN" ? <ElectionBlackoutPanel /> : null}
        </div>
      );
      case "moderation": return (
        <div className="space-y-6">
          <ModerationQueue />
          <TopicBalance />
        </div>
      );
      case "users": return <UserManagement />;
      case "civic": return <CivicIssueReviewPanel />;
      case "roles": return <RolesManagement />;
      case "health": return <PlatformHealth />;
      default: return <ExecutiveOverview />;
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-8 lg:flex-row lg:px-8">
        
        {/* Professional Light Sidebar */}
        <aside className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:w-72 h-fit">
          <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Pulse HQ</p>
            <h1 className="mt-1 text-lg font-bold text-slate-900">Operations Console</h1>
            <p className="mt-1 text-xs text-slate-500">Enterprise Administration</p>
          </div>

          <nav className="space-y-1">
            {navItems.filter((item) => canAccess(item.minimumRole)).map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    isActive 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-4 w-4 text-slate-400" /> Sign out securely
            </button>
          </div>
        </aside>

        {/* Dynamic Content Area */}
        <section className="flex-1 w-full max-w-full overflow-hidden">
          {renderView()}
        </section>

      </div>
    </main>
  );
}