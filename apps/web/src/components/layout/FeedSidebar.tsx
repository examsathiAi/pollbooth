"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Home, Landmark, Newspaper, Tv, Trophy, MapPin, Shield, HelpCircle, AlertTriangle,
  Vote, Users, GraduationCap, HeartPulse, Cpu, Utensils, Plane, Shirt, Car, Building2,
  Rocket, Briefcase, Leaf, Layers, Banknote, ChevronDown, User, Search,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavItem { id: string; label: string; icon: LucideIcon; category?: string }

const BROWSE: NavItem[] = [
  { id: "for-you", label: "Home", icon: Home },
];

const TOPICS: NavItem[] = [
  { id: "politics", label: "Politics", icon: Vote, category: "POLITICS" },
  { id: "news", label: "News", icon: Newspaper, category: "CURRENT_EVENTS" },
  { id: "sports", label: "Sports", icon: Trophy, category: "SPORTS" },
  { id: "bollywood", label: "Bollywood", icon: Tv, category: "BOLLYWOOD" },
  { id: "tech", label: "Tech", icon: Cpu, category: "TECH" },
  { id: "economy", label: "Economy", icon: Banknote, category: "ECONOMY" },
  { id: "civic", label: "Civic", icon: Landmark, category: "CIVIC" },
  { id: "local", label: "Local", icon: MapPin, category: "LOCAL" },
  { id: "social", label: "Social", icon: Users, category: "SOCIAL" },
  { id: "education", label: "Education", icon: GraduationCap, category: "EDUCATION" },
  { id: "health", label: "Health", icon: HeartPulse, category: "HEALTH" },
  { id: "food", label: "Food", icon: Utensils, category: "FOOD" },
  { id: "travel", label: "Travel", icon: Plane, category: "TRAVEL" },
  { id: "fashion", label: "Fashion", icon: Shirt, category: "FASHION" },
  { id: "auto", label: "Auto", icon: Car, category: "AUTO" },
  { id: "real-estate", label: "Real Estate", icon: Building2, category: "REAL_ESTATE" },
  { id: "startups", label: "Startups", icon: Rocket, category: "STARTUPS" },
  { id: "work-culture", label: "Work Culture", icon: Briefcase, category: "WORK_CULTURE" },
  { id: "environment", label: "Environment", icon: Leaf, category: "ENVIRONMENT" },
  { id: "other", label: "Other", icon: Layers, category: "OTHER" },
];

interface Group { id: string; label: string; icon: LucideIcon; items: string[] }

const GROUPS: Group[] = [
  { id: "g-news", label: "Politics & News", icon: Newspaper, items: ["politics", "news", "civic", "local"] },
  { id: "g-fun", label: "Entertainment & Sports", icon: Trophy, items: ["bollywood", "sports"] },
  { id: "g-money", label: "Money & Careers", icon: Briefcase, items: ["economy", "startups", "real-estate", "work-culture", "education"] },
  { id: "g-tech", label: "Tech & Auto", icon: Cpu, items: ["tech", "auto"] },
  { id: "g-society", label: "Society & Health", icon: Users, items: ["social", "health", "environment", "other"] },
  { id: "g-life", label: "Lifestyle", icon: Utensils, items: ["food", "travel", "fashion"] },
];

const byId = (id: string) => TOPICS.find((t) => t.id === id) as NavItem;

const rowCls = (active: boolean) =>
  "flex w-full items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-left text-[14px] font-medium transition-colors duration-150 " +
  (active ? "border-maroon bg-paper-card text-maroon" : "border-transparent text-ink hover:bg-paper-card");
const headCls = "px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted/80";
const linkCls = "block rounded-md px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:text-ink";

interface FeedSidebarProps {
  activeCategory?: string;
  onCategoryChange?: (category: string, categoryFilter?: string) => void;
  forceVisible?: boolean;
}

export function FeedSidebar({ activeCategory: propActive, onCategoryChange, forceVisible }: FeedSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [localActive, setLocalActive] = useState(propActive || "for-you");
  const [openGroup, setOpenGroup] = useState<string | null>(
    GROUPS.find((g) => g.items.includes(propActive || "for-you"))?.id ?? "g-news"
  );

  const currentActive = propActive !== undefined ? propActive : localActive;

  const handleNav = (id: string, category?: string) => {
    if (typeof onCategoryChange === "function") {
      onCategoryChange(id, category);
      return;
    }
    setLocalActive(id);
    const fire = () => {
      try { window.dispatchEvent(new CustomEvent("globalCategoryChange", { detail: { id, category } })); } catch (e) {}
    };
    if (pathname !== "/feed") {
      router.push("/feed");
      setTimeout(fire, 300);
    } else {
      fire();
    }
  };

  const renderRow = (item: NavItem) => {
    const Icon = item.icon;
    const active = currentActive === item.id;
    return (
      <button key={item.id} onClick={() => handleNav(item.id, item.category)} aria-current={active ? "page" : undefined} className={rowCls(active)}>
        <Icon className={"h-[18px] w-[18px] shrink-0 " + (active ? "text-maroon" : "text-ink-muted")} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  const renderGroup = (g: Group) => {
    const Icon = g.icon;
    const isOpen = openGroup === g.id;
    const hasActive = g.items.includes(currentActive);
    return (
      <div key={g.id}>
        <button
          onClick={(e) => { e.stopPropagation(); setOpenGroup(isOpen ? null : g.id); }}
          aria-expanded={isOpen}
          className={"flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] font-semibold transition-colors duration-150 hover:bg-paper-card " + (hasActive ? "text-maroon" : "text-ink")}
        >
          <Icon className={"h-[18px] w-[18px] shrink-0 " + (hasActive ? "text-maroon" : "text-ink-muted")} />
          <span className="flex-1 truncate">{g.label}</span>
          <ChevronDown className={"h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 " + (isOpen ? "rotate-180" : "")} />
        </button>
        {isOpen && (
          <div className="mt-0.5 space-y-0.5 pl-6">
            {g.items.map((id) => renderRow(byId(id)))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={forceVisible ? "block w-full space-y-5 pr-1" : "hidden w-full space-y-5 pr-1 lg:block lg:max-h-full lg:overflow-y-auto scrollbar-auto-hide"}>
      {!forceVisible && (
        <div className="relative px-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search polls"
            aria-label="Search polls"
            onChange={(e) => window.dispatchEvent(new CustomEvent("globalSearch", { detail: { query: e.target.value } }))}
            className="h-9 w-full rounded-full border border-paper-border/60 bg-paper-card pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-muted/70 focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon/30"
          />
        </div>
      )}

      <nav className="space-y-0.5">
        <p className={headCls}>Browse</p>
        {BROWSE.map(renderRow)}
      </nav>

      <nav className="space-y-0.5">
        <p className={headCls}>Topics</p>
        {GROUPS.map(renderGroup)}
      </nav>

      {user && (
        <nav className="space-y-0.5">
          <p className={headCls}>Account</p>
          <Link href="/profile" className={rowCls(pathname === "/profile")}>
            <User className="h-[18px] w-[18px] shrink-0 text-ink-muted" />
            <span>My profile</span>
          </Link>
        </nav>
      )}

      <div className="space-y-0.5 border-t border-paper-border/40 pb-6 pt-3">
        <Link href="/about" className={linkCls}>About</Link>
        <Link href="/privacy" className={linkCls}>Privacy Policy</Link>
        <Link href="/terms" className={linkCls}>Terms of Service</Link>
        <Link href="/grievance" className={linkCls}>Contact &amp; Grievance</Link>
      </div>
    </aside>
  );
}
