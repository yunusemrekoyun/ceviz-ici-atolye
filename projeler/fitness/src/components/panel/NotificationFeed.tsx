"use client";

import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

interface Props {
  initialNotifications: Notification[];
  initialUnreadCount: number;
}

const TYPE_STYLE: Record<string, string> = {
  info:    "border-l-sky-500 bg-sky-500/5",
  success: "border-l-emerald-500 bg-emerald-500/5",
  warn:    "border-l-amber-500 bg-amber-500/5",
  danger:  "border-l-rose-500 bg-rose-500/5",
};

const DOT_STYLE: Record<string, string> = {
  info: "bg-sky-400", success: "bg-emerald-400", warn: "bg-amber-400", danger: "bg-rose-400",
};

export function NotificationFeed({ initialNotifications, initialUnreadCount }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  async function markRead(id: string) {
    await fetch(`/api/panel/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch("/api/panel/notifications/read-all", { method: "PATCH" });
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    setUnreadCount(0);
  }

  if (notifications.length === 0) return null;

  return (
    <div className="card-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-neon" />
          <span className="font-semibold">Bildirimler</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-neon text-ink-950 text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-label hover:text-white transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Tümünü okundu işaretle
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.readAt && markRead(n.id)}
            className={`border-l-2 rounded-r-xl p-3 pl-4 transition-opacity cursor-default ${
              TYPE_STYLE[n.type] ?? TYPE_STYLE.info
            } ${n.readAt ? "opacity-50" : "cursor-pointer hover:opacity-90"}`}
          >
            <div className="flex items-start gap-2">
              {!n.readAt && (
                <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${DOT_STYLE[n.type] ?? "bg-white"}`} />
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${n.readAt ? "text-body" : "text-strong"}`}>{n.title}</div>
                <div className="text-xs text-muted mt-0.5">{n.body}</div>
              </div>
              <div className="text-[10px] text-faint shrink-0 mt-0.5">
                {new Date(n.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
