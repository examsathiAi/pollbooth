"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { FeedSidebar } from "@/components/layout/FeedSidebar";
import { FeedRightRail } from "@/components/layout/FeedRightRail";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Search, Menu, X } from "lucide-react";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(80);
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // While the drawer is open: lock page scroll, close on Escape, close if viewport grows to desktop width
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

  useEffect(() => {
    if (!headerRef.current) return;
    const updateHeight = () => setHeaderHeight(headerRef.current?.getBoundingClientRect().height || 80);
    updateHeight();
    const resizeObserver = new ResizeObserver(() => updateHeight());
    resizeObserver.observe(headerRef.current);
    window.addEventListener("resize", updateHeight);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  return (
    <div className="min-h-screen bg-paper-bg">
      {/* ENTERPRISE MASTER HEADER */}
      <header
        ref={headerRef}
        className="fixed top-0 inset-x-0 z-50 bg-[#e8e1cc]/95 backdrop-blur-md border-b border-paper-border/60 shadow-sm"
      >
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            
            {/* BRANDING LOCKUP - Aligned exactly to the 260px sidebar on desktop, shrinks on mobile */}
            <Link href="/feed" className="flex items-center shrink-0 group active:scale-95 transition-transform w-[120px] sm:w-[160px] lg:w-[220px] pr-2 sm:pr-4">
              <img src="/icon.png" alt="PollBooth Logo" className="h-[30px] sm:h-[38px] lg:h-[46px] w-full object-contain object-left" />
            </Link>

            {/* CENTRAL SEARCH */}
            <div className="flex-1 mx-8 hidden md:flex items-center gap-5 min-w-0">
              <div className="h-9 w-px bg-paper-border/70 shrink-0" />
              <p
                title="Your vote isn't just a number — aggregated results reach the departments, representatives, and media who can act on them."
                className="text-sm font-medium text-maroon/80 italic tracking-wide whitespace-nowrap mt-1"
              >
                Not just a vote — a voice that reaches decision-makers.
              </p>
              <div className="flex-1 min-w-4" />
              <div className="relative group w-64 shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted group-focus-within:text-maroon transition-colors" />
                <input
                  type="text"
                  placeholder="Search polls..."
                  onChange={(e) => window.dispatchEvent(new CustomEvent("globalSearch", { detail: { query: e.target.value } }))}
                  className="w-full bg-paper-card border border-paper-border/50 text-ink text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* USER CONTROLS */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {!user ? (
                <>
                  <Link href="/auth/login?mode=login" className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-ink-muted hover:text-ink uppercase tracking-widest transition-colors whitespace-nowrap">Log In</Link>
                  <Link href="/auth/login?mode=signup" className="px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold bg-maroon text-paper-bg rounded-full uppercase tracking-widest hover:bg-maroon-dark transition-all shadow-sm whitespace-nowrap">Sign Up</Link>
                </>
              ) : (
                <>
                  <Link href="/profile" className="px-3 py-2 text-sm font-bold text-ink-muted hover:text-ink uppercase tracking-widest hidden sm:block transition-colors">USER</Link>
                  <div className="px-2">
                    <NotificationBell />
                  </div>
                  <button onClick={logout} className="px-3 py-2 text-sm font-bold text-ink-muted hover:text-ink uppercase tracking-widest transition-colors">Logout</button>
                </>
              )}
            </div>
          </div>

          {/* MOBILE / TABLET SECOND ROW: menu trigger + search (below lg) */}
          <div className="lg:hidden flex items-center gap-3 pb-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-ink/10 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="relative group flex-1 min-w-0 md:hidden">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted group-focus-within:text-maroon transition-colors" />
              <input
                type="text"
                placeholder="Search polls..."
                onChange={(e) => window.dispatchEvent(new CustomEvent("globalSearch", { detail: { query: e.target.value } }))}
                className="w-full bg-paper-card border border-paper-border/50 text-ink text-base rounded-full pl-10 pr-4 h-10 focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30 transition-all shadow-inner"
              />
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE NAVIGATION DRAWER (below lg) */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] ${drawerOpen ? "visible" : "invisible pointer-events-none transition-[visibility] delay-300"}`}
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
            <span className="text-sm font-bold uppercase tracking-widest text-maroon">Menu</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-paper-card hover:text-ink transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-3">
            <FeedSidebar forceVisible />
          </div>
        </div>
      </div>

      {/* FACEBOOK-STYLE SPA GRID */}
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 transition-all duration-300" style={{ paddingTop: `${headerHeight + 16}px` }}>
        <div className="flex flex-col lg:flex-row gap-6 pb-12 relative items-start">
          
          {/* FROZEN LEFT SIDEBAR */}
          <div className="hidden lg:block w-[220px] shrink-0 sticky transition-all duration-300" style={{ top: `${headerHeight + 16}px` }}>
            <FeedSidebar />
          </div>

          {/* DYNAMIC CENTER CONTENT */}
          <main className="flex-1 min-w-0 w-full transition-all duration-300">
            {children}
          </main>

          {/* FROZEN RIGHT SIDEBAR */}
          <div className="hidden lg:block lg:w-[300px] shrink-0 lg:sticky transition-all duration-300" style={{ top: `${headerHeight + 16}px` }}>
            <FeedRightRail />
          </div>

        </div>
      </div>
    </div>
  );
}