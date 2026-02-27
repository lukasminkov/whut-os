"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Zap,
  Calendar,
  Mail,
  Clock,
  AlertCircle,
  Loader2,
  Inbox,
} from "lucide-react";
import type { Notification, NotificationType } from "@/lib/notifications";

const ICON_MAP: Record<NotificationType, typeof Bell> = {
  integration: Zap,
  agent_task: Zap,
  calendar: Calendar,
  email: Mail,
  reminder: Clock,
  system: AlertCircle,
};

const COLOR_MAP: Record<NotificationType, string> = {
  integration: "bg-[#00d4aa]/10 text-[#00d4aa]",
  agent_task: "bg-[#00d4aa]/10 text-[#00d4aa]",
  calendar: "bg-blue-500/10 text-blue-400",
  email: "bg-white/[0.04] text-white/60",
  reminder: "bg-amber-500/10 text-amber-400",
  system: "bg-white/[0.04] text-white/50",
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    try {
      const params = filter === "unread" ? "?unread=true" : "";
      const res = await fetch(`/api/notifications${params}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (ids: string[]) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, read: true }),
    });
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
    );
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length) await markAsRead(unreadIds);
  };

  const deleteNotification = async (id: string) => {
    await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen px-8 py-10 text-white max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-white/40">
            {unreadCount} unread
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter(filter === "all" ? "unread" : "all")}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              filter === "unread"
                ? "border-[#00d4aa]/30 text-[#00d4aa] bg-[#00d4aa]/10"
                : "border-white/[0.06] text-white/40 hover:text-white/60"
            }`}
          >
            {filter === "unread" ? "Unread" : "All"}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/40 hover:text-white/60 border border-white/[0.06] rounded-lg transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 text-white/20 animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/20">
          <Inbox className="h-10 w-10 mb-3" />
          <p className="text-sm">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = ICON_MAP[n.type as NotificationType] || Bell;
            const colorClass = COLOR_MAP[n.type as NotificationType] || COLOR_MAP.system;

            return (
              <div
                key={n.id}
                className={`group flex items-start gap-3 rounded-xl border p-4 transition-all duration-200 hover:bg-white/[0.04] ${
                  n.read
                    ? "border-white/[0.04] bg-transparent"
                    : "border-white/[0.08] bg-white/[0.02]"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        n.read ? "text-white/50" : "text-white"
                      }`}
                    >
                      {n.title}
                    </span>
                    {!n.read && (
                      <div className="h-1.5 w-1.5 rounded-full bg-[#00d4aa]" />
                    )}
                  </div>
                  <p className="text-xs text-white/35 mt-0.5">{n.description}</p>
                  <p className="text-[10px] text-white/20 mt-1">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.read && (
                    <button
                      onClick={() => markAsRead([n.id])}
                      className="p-1.5 text-white/30 hover:text-[#00d4aa] transition-colors"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
