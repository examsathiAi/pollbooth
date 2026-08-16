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
      const storedRole = localStorage.getItem("pollbooth_user_role") || null;
      const token = localStorage.getItem("pollbooth_token");
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
    localStorage.removeItem("pollbooth_token");
    localStorage.removeItem("pollbooth_user_role");
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
    <main className="min-h-screen bg-[#f4efe7] text-[#1f1b18] font-sans">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        <aside className="w-full shrink-0 rounded-[22px] border border-[#d8ceb8] bg-white p-6 shadow-sm lg:w-72 h-fit">
          <div className="mb-6 rounded-xl border border-maroon/20 bg-maroon/5 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-maroon">PollBooth HQ</p>
            <h1 className="mt-1 text-lg font-bold text-[#1f1b18]">Operations Console</h1>
            <p className="mt-1 text-xs text-[#625a50]">Enterprise Administration</p>
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
                      ? "bg-maroon/10 text-maroon"
                      : "text-[#625a50] hover:bg-[#f4efe7] hover:text-[#1f1b18]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-maroon" : "text-[#625a50]"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-[#d8ceb8] pt-6">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#625a50] transition hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-4 w-4 text-[#625a50]" /> Sign out securely
            </button>
          </div>
        </aside>

        <section className="flex-1 w-full max-w-full overflow-hidden">
          {renderView()}
        </section>
      </div>
    </main>
  );
}