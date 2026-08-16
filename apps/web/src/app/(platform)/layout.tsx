"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { FeedSidebar } from "@/components/layout/FeedSidebar";
import { FeedRightRail } from "@/components/layout/FeedRightRail";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Search } from "lucide-react";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(80);

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
            
            {/* BRANDING LOCKUP - Aligned exactly to the 260px sidebar */}
            <Link href="/feed" className="flex items-center shrink-0 group active:scale-95 transition-transform w-[260px] pr-4">
              <img src="/icon.png" alt="PollBooth Logo" className="h-[96px] w-full object-contain object-left scale-110 origin-left" />
            </Link>

            {/* CENTRAL SEARCH */}
            <div className="flex-1 max-w-2xl mx-8 hidden md:block">
              <div className="relative group">
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
                  <Link href="/auth/login?mode=login" className="px-3 py-2 text-sm font-bold text-ink-muted hover:text-ink uppercase tracking-widest transition-colors">Log In</Link>
                  <Link href="/auth/login?mode=signup" className="px-5 py-2 text-sm font-bold bg-maroon text-paper-bg rounded-full uppercase tracking-widest hover:bg-maroon-dark transition-all shadow-sm">Sign Up</Link>
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
        </div>
      </header>

      {/* FACEBOOK-STYLE SPA GRID */}
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 transition-all duration-300" style={{ paddingTop: `${headerHeight + 24}px` }}>
        <div className="flex flex-col lg:flex-row gap-10 pb-12 relative items-start">
          
          {/* FROZEN LEFT SIDEBAR */}
          <div className="hidden lg:block w-[260px] shrink-0 sticky transition-all duration-300" style={{ top: `${headerHeight + 24}px` }}>
            <FeedSidebar />
          </div>

          {/* DYNAMIC CENTER CONTENT */}
          <main className="flex-1 min-w-0 w-full transition-all duration-300">
            {children}
          </main>

          {/* FROZEN RIGHT SIDEBAR */}
          <div className="hidden lg:block w-[340px] shrink-0 sticky transition-all duration-300" style={{ top: `${headerHeight + 24}px` }}>
            <FeedRightRail />
          </div>

        </div>
      </div>
    </div>
  );
}