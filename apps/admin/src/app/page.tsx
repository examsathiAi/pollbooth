"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Activity, FilePlus, History, LayoutDashboard, LogOut, MessageSquareWarning, PencilRuler, Scale, ShieldCheck, Users, Briefcase } from "lucide-react";
import { api } from "@/lib/api";
import { ActivityLog } from "@/components/ActivityLog";
import { ElectionBlackoutPanel } from "@/components/ElectionBlackoutPanel";
import { ExecutiveOverview } from "@/components/ExecutiveOverview";
import { ModerationInbox } from "@/components/ModerationInbox";
import { PlatformHealth } from "@/components/PlatformHealth";
import { PollCreationPanel } from "@/components/PollCreationPanel";
import { PollManager } from "@/components/PollManager";
import { RolesManagement } from "@/components/RolesManagement";
import { SurveysDashboard } from "@/components/SurveysDashboard";
import { TopicBalance } from "@/components/TopicBalance";
import { UserManagement } from "@/components/UserManagement";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, minimumRole: "MODERATOR" },
  { id: "create", label: "Create Poll", icon: FilePlus, minimumRole: "ADMIN" },
  { id: "polls", label: "Polls", icon: PencilRuler, minimumRole: "ADMIN", badge: "pending_polls" },
  { id: "moderation", label: "Moderation", icon: MessageSquareWarning, minimumRole: "MODERATOR", badge: "moderation" },
  { id: "surveys", label: "B2B Campaigns", icon: Briefcase, minimumRole: "ADMIN" },
  { id: "users", label: "Members", icon: Users, minimumRole: "ADMIN" },
  { id: "compliance", label: "Compliance", icon: Scale, minimumRole: "SUPER_ADMIN" },
  { id: "roles", label: "Team & Roles", icon: ShieldCheck, minimumRole: "SUPER_ADMIN" },
  { id: "activity", label: "Activity Log", icon: History, minimumRole: "SUPER_ADMIN" },
  { id: "health", label: "System Health", icon: Activity, minimumRole: "SUPER_ADMIN" },
];

const ROLE_LEVELS: Record<string, number> = { USER: 0, MODERATOR: 1, ADMIN: 2, SUPER_ADMIN: 3 };

export default function AdminPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState("overview");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ pending_polls: number; pending_reports: number; pending_civic: number } | null>(null);

  const refreshCounts = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/admin/counts");
      setCounts(res.data);
    } catch {
      setCounts(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("pollbooth_user_role") || null;
      const token = localStorage.getItem("pollbooth_token");
      setUserRole(storedRole);
      if (!token) {
        router.replace("/login");
        return;
      }
      refreshCounts();
    }
  }, [router, refreshCounts]);

  const canAccess = (minimumRole: string) => (ROLE_LEVELS[userRole || "USER"] ?? 0) >= (ROLE_LEVELS[minimumRole] ?? 0);

  const handleLogout = () => {
    localStorage.removeItem("pollbooth_token");
    localStorage.removeItem("pollbooth_user_role");
    router.replace("/login");
  };

  const badgeFor = (key?: string): number => {
    if (!counts || !key) return 0;
    if (key === "pending_polls") return counts.pending_polls;
    if (key === "moderation") return counts.pending_reports + counts.pending_civic;
    return 0;
  };

  const renderView = () => {
    switch (activeView) {
      case "overview":
        return (
          <div className="space-y-6">
            <ExecutiveOverview />
            <TopicBalance />
          </div>
        );
      case "create": return <PollCreationPanel />;
      case "polls": return <PollManager />;
      case "moderation": return <ModerationInbox onChanged={refreshCounts} />;
      case "surveys": return <SurveysDashboard />;
      case "users": return <UserManagement />;
      case "compliance": return <ElectionBlackoutPanel />;
      case "roles": return <RolesManagement />;
      case "activity": return <ActivityLog />;
      case "health": return <PlatformHealth />;
      default: return <ExecutiveOverview />;
    }
  };

  return (
    <main className="min-h-screen bg-[#f4efe7] font-sans text-[#1f1b18]">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        <aside className="h-fit w-full shrink-0 rounded-[22px] border border-[#d8ceb8] bg-white p-6 shadow-sm lg:w-72">
          <div className="mb-6 rounded-xl border border-maroon/20 bg-maroon/5 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-maroon">PollBooth HQ</p>
            <h1 className="mt-1 text-lg font-bold text-[#1f1b18]">Operations Console</h1>
            <p className="mt-1 text-xs text-[#625a50]">{userRole ? userRole.replace("_", " ").toLowerCase() : "staff"}</p>
          </div>

          <nav className="space-y-1">
            {navItems.filter((item) => canAccess(item.minimumRole)).map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const badge = badgeFor((item as any).badge);
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    isActive ? "bg-maroon/10 text-maroon" : "text-[#625a50] hover:bg-[#f4efe7] hover:text-[#1f1b18]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-maroon" : "text-[#625a50]"}`} />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 ? <span className="rounded-full bg-[#7a1f10] px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span> : null}
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

        <section className="w-full max-w-full flex-1 overflow-hidden">{renderView()}</section>
      </div>
    </main>
  );
}
