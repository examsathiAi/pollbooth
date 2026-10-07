"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { FeedSidebar } from "@/components/layout/FeedSidebar";
import { FeedRightRail } from "@/components/layout/FeedRightRail";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Search, Menu, X } from "lucide-react";

function initialOf(user: any): string {
  return String(user?.name || user?.username || user?.email || "U").charAt(0).toUpperCase();
}

function Logo({ variant }: { variant: "full" | "compact" }) {
  return (
    <Link href="/feed" aria-label="PollBooth home" className={"inline-flex shrink-0 items-center transition-transform active:scale-95 " + (variant === "full" ? "mb-4" : "")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {variant === "full" ? (
        <img src="/pollbooth-logo.png" alt="PollBooth" className="h-24 w-auto max-w-full object-contain object-left" />
      ) : (
        <span className="inline-flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pollbooth-mark.png" alt="PollBooth" className="h-9 w-auto" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pollbooth-wordmark.png" alt="" className="h-5 w-auto" />
        </span>
      )}
    </Link>
  );
}

function AccountMenu({ user, logout }: { user: any; logout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const name = String(user?.username || user?.name || user?.email || "");
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-maroon text-sm font-semibold text-paper-bg transition-opacity hover:opacity-90"
      >
        {initialOf(user)}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-paper-border bg-paper-bg p-1.5 shadow-xl">
          {name && <p className="truncate px-3 py-2 text-[13px] text-ink-muted">{name}</p>}
          <Link href="/profile" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-[14px] font-medium text-ink transition-colors hover:bg-paper-card">My profile</Link>
          <button type="button" onClick={logout} className="block w-full rounded-lg px-3 py-2 text-left text-[14px] font-medium text-ink transition-colors hover:bg-paper-card">Log out</button>
        </div>
      )}
    </div>
  );
}

function AccountControls({ user, logout, compact }: { user: any; logout: () => void; compact?: boolean }) {
  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Link href="/auth/login?mode=login" className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink">Log in</Link>
        <Link href="/auth/login?mode=signup" className="whitespace-nowrap rounded-full bg-maroon px-4 py-1.5 text-sm font-semibold text-paper-bg transition-colors hover:bg-maroon-dark">Sign up</Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <NotificationBell />
      <AccountMenu user={user} logout={logout} />
    </div>
  );
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setDrawerOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-paper-bg">
      {/* PHONE / TABLET TOP BAR (desktop has no top bar) */}
      <header className="sticky top-0 z-50 border-b border-paper-border/60 bg-[#e8e1cc]/95 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/10"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Logo variant="compact" />
          <div className="flex-1" />
          <AccountControls user={user} logout={logout} compact />
        </div>
      </header>

        <div className="px-3 pt-3 lg:hidden">
          <div className="group relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted transition-colors group-focus-within:text-maroon" />
            <input
              type="text"
              placeholder="Search polls"
              aria-label="Search polls"
              onChange={(e) => window.dispatchEvent(new CustomEvent("globalSearch", { detail: { query: e.target.value } }))}
              className="h-10 w-full rounded-full border border-paper-border/50 bg-paper-card pl-10 pr-4 text-base text-ink focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon/30"
            />
          </div>
        </div>

      {/* MOBILE NAVIGATION DRAWER (below lg) */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden ${drawerOpen ? "visible" : "invisible pointer-events-none transition-[visibility] delay-300"}`}
        aria-hidden={!drawerOpen}
      >
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0"}`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a, button")) setDrawerOpen(false);
          }}
          className={`absolute inset-y-0 left-0 w-[85%] max-w-[320px] overflow-y-auto border-r border-paper-border/60 bg-paper-bg shadow-xl transition-transform duration-300 ease-out ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between border-b border-paper-border/40 px-4 py-3">
            <span className="text-sm font-semibold text-maroon">Menu</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-card hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-3">
            <FeedSidebar forceVisible />
            {user && (
              <button onClick={logout} className="mt-2 w-full rounded-lg px-3 py-2 text-left text-[14px] font-medium text-ink-muted transition-colors hover:bg-paper-card hover:text-ink">Log out</button>
            )}
          </div>
        </div>
      </div>

      {/* DESKTOP: left column (logo + topics), centre feed, right column (account + rail) */}
      <div className="mx-auto flex max-w-[1500px] items-start gap-6 px-4 sm:px-6 lg:px-8">
        <div className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col py-4 lg:flex">
          <Logo variant="full" />
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-auto-hide">
            <FeedSidebar />
          </div>
        </div>

        <main className="w-full min-w-0 flex-1 py-4 lg:py-6">{children}</main>

        <div className="sticky top-0 hidden max-h-screen w-[300px] shrink-0 flex-col gap-3 overflow-y-auto py-4 scrollbar-auto-hide lg:flex">
          <div className="flex justify-end">
            <AccountControls user={user} logout={logout} />
          </div>
          <FeedRightRail />
        </div>
      </div>
    </div>
  );
}
