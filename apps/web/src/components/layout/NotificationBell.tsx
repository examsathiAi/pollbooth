"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Bell, CheckCheck, MessageCircle, Sparkles, TrendingUp } from "lucide-react";
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

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = async () => {
    try {
      const res = await api.get<{ notifications?: NotificationItem[]; unread_count?: number }>('/api/v1/notifications', { params: { limit: 8 } });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/api/v1/notifications/${notificationId}/read`);
      setNotifications((current) => current.map((notification) => notification.id === notificationId ? { ...notification, is_read: true } : notification));
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch {
      // ignore and keep UI responsive
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/api/v1/notifications/read-all');
      setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore and keep UI responsive
    }
  };

  const formatRelativeTime = (input?: string) => {
    if (!input) return "Just now";
    const diffMs = Date.now() - new Date(input).getTime();
    const minutes = Math.max(1, Math.floor(diffMs / 60000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getNotificationMeta = (notification: NotificationItem) => {
    const type = notification.type || "GENERAL";
    if (type === "SUGGESTION_RECEIVED") {
      return { icon: Sparkles, tone: "bg-sky-50 text-sky-700" };
    }
    if (type === "SUGGESTION_APPROVED") {
      return { icon: CheckCheck, tone: "bg-emerald-50 text-emerald-700" };
    }
    if (type === "SUGGESTION_REJECTED") {
      return { icon: Bell, tone: "bg-rose-50 text-rose-700" };
    }
    if (type === "OPINION_REACTION") {
      return { icon: MessageCircle, tone: "bg-blue-50 text-blue-700" };
    }
    if (type === "MILESTONE") {
      return { icon: Sparkles, tone: "bg-amber-50 text-amber-700" };
    }
    return { icon: TrendingUp, tone: "bg-cyan-50 text-cyan-700" };
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((value) => !value);
          void load();
        }}
        className="relative rounded-sm border border-paper-border bg-paper-card p-2 text-ink shadow-sm"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-maroon px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-80 rounded-sm border border-paper-border bg-paper-card p-3 shadow-xl z-50">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Notifications</p>
              <p className="text-xs text-slate-500">{user?.username ? `Hey ${user.username}, here’s what’s new.` : "Your live Pulse activity"}</p>
              {unreadCount > 0 ? <p className="text-xs text-slate-500">{unreadCount} new update{unreadCount === 1 ? "" : "s"}</p> : null}
            </div>
            {unreadCount > 0 ? (
              <button onClick={() => void markAllAsRead()} className="text-xs font-semibold text-blue-600">Mark all read</button>
            ) : null}
          </div>
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="rounded-sm border border-dashed border-paper-border bg-paper-card p-3 text-sm text-ink-muted">
                No fresh activity yet. When someone reacts or a poll spikes, it will appear here.
              </div>
            ) : (
              notifications.slice(0, 6).map((notification) => {
                const href = notification.data?.poll_id ? `/poll/${notification.data.poll_id}` : "/feed";
                const meta = getNotificationMeta(notification);
                const Icon = meta.icon;
                return (
                  <Link key={notification.id} href={href} onClick={() => void markAsRead(notification.id)} className={`flex gap-2 rounded-sm border p-2.5 transition ${notification.is_read ? "border-paper-border bg-paper-card" : "border-paper-border bg-paper-card/80"}`}>
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{notification.title}</p>
                        {!notification.is_read ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-maroon" /> : null}
                      </div>
                      <p className="mt-0.5 text-xs leading-5 text-ink-muted">{notification.body}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-muted">
                        <span>{formatRelativeTime(notification.created_at)}</span>
                        {notification.data?.reaction_type ? <span>• {notification.data.reaction_type.toLowerCase()}</span> : null}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
          <div className="mt-3 rounded-t border-t border-slate-200 pt-3 text-sm text-slate-500">
            <Link href="/notifications" className="font-semibold text-blue-600 hover:text-blue-700">
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
