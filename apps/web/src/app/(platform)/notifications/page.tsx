"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Check, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at?: string;
  type?: string;
  data?: {
    poll_id?: string;
    opinion_id?: string;
    reaction_type?: string;
  } | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get<{ notifications?: NotificationItem[] }>('/api/v1/notifications', { params: { limit: 20 } });
      setNotifications(res.data.notifications || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to load notifications right now.");
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (notificationId: string) => {
    try {
      await api.patch(`/api/v1/notifications/${notificationId}/read`);
      setNotifications((current) => current.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item)));
    } catch {
      // ignore failures, refresh on next load
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/api/v1/notifications/read-all');
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch {
      // ignore failures
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const formatRelativeTime = (value?: string) => {
    if (!value) return "Just now";
    const diffMs = Date.now() - new Date(value).getTime();
    const minutes = Math.max(1, Math.floor(diffMs / 60000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <main className="w-full bg-[#f4efe7] py-10 px-4 text-[#1f1b18] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[32px] border border-[#d8ceb8] bg-[#fffdf9] p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#f7f1e8] p-3 text-[#7a1f10]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#7a1f10]">Notifications</p>
              <h1 className="mt-2 text-3xl font-semibold text-[#1f1b18]">Your recent activity</h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-[#625a50]">Stay on top of reactions, poll updates, and platform alerts in one place.</p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-[32px] border border-[#d8ceb8] bg-[#fffdf9] p-5 shadow-sm">
          <p className="text-sm text-[#625a50]">A dedicated notifications page makes it easier to review what matters most.</p>
          <div className="flex items-center gap-2">
            <button onClick={() => void loadNotifications()} className="rounded-2xl border border-[#d8ceb8] bg-[#f7f1e8] px-4 py-2 text-sm text-[#1f1b18] transition hover:bg-[#f2e7dc]">
              Refresh
            </button>
            <button onClick={() => void markAllRead()} className="rounded-2xl bg-[#7a1f10] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5c1709]">
              Mark all read
            </button>
          </div>
        </div>

        <section className="rounded-[32px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
          {loading ? (
            <div className="text-center text-[#625a50]">Loading notificationsâ€¦</div>
          ) : error ? (
            <div className="space-y-3">
              <p className="text-sm text-rose-600">{error}</p>
              <Link href="/auth/login?mode=login&redirect=/notifications" className="inline-flex rounded-2xl bg-[#7a1f10] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5c1709]">
                Sign in to view notifications
              </Link>
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#d8ceb8] bg-[#f7f1e8] p-8 text-center text-[#625a50]">
              No notifications yet. Check back after your next poll or reaction.
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <article key={notification.id} className={`rounded-3xl border p-4 ${notification.is_read ? "border-[#d8ceb8] bg-[#f7f1e8]" : "border-[#e4c7ba] bg-[#fdf4f0]"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1f1b18]">{notification.title}</p>
                      <p className="mt-2 text-sm text-[#625a50]">{notification.body}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#625a50]">
                      <span>{formatRelativeTime(notification.created_at)}</span>
                      {!notification.is_read ? <span className="rounded-full bg-[#7a1f10] px-2 py-1 text-white">New</span> : null}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link href={notification.data?.poll_id ? `/poll/${notification.data.poll_id}` : "/feed"} className="rounded-2xl bg-[#1f1b18] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2d241e]">
                      View related poll
                    </Link>
                    {!notification.is_read ? (
                      <button onClick={() => void markRead(notification.id)} className="rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] transition hover:bg-[#f7f1e8]">
                        Mark as read
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="rounded-[32px] border border-[#d8ceb8] bg-[#f7f1e8] p-6 text-sm text-[#625a50]">
          <Sparkles className="inline h-4 w-4 text-[#7a1f10]" />
          <span className="ml-2">This page is part of the visibility improvements for PollBoothâ€™s consent, notifications, and accountability flows.</span>
        </div>
      </div>
    </main>
  );
}
