"use client";

import { useState, useCallback } from "react";
import { Send, Bell, Users, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { formatDate } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
}

interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

interface Props {
  initialNotifications: NotificationRecord[];
  initialTotal: number;
  initialTodayCount: number;
  initialUnreadCount: number;
  plans: Plan[];
}

const AUDIENCE_OPTIONS = [
  { value: "all_active",   label: "Tüm aktif üyeler" },
  { value: "expiring_7",   label: "7 günde bitecekler" },
  { value: "expiring_30",  label: "30 günde bitecekler" },
  { value: "new_30",       label: "Son 30 günde kayıt olanlar" },
  { value: "by_plan",      label: "Belirli plan üyeleri" },
  { value: "all_trainers", label: "Tüm eğitmenler" },
];

const TYPE_OPTIONS = [
  { value: "info",    label: "Bilgi",   color: "text-sky-400" },
  { value: "success", label: "Başarı",  color: "text-emerald-400" },
  { value: "warn",    label: "Uyarı",   color: "text-amber-400" },
  { value: "danger",  label: "Önemli",  color: "text-rose-400" },
];

const TYPE_BADGE: Record<string, string> = {
  info: "bg-sky-500/15 text-sky-300",
  success: "bg-emerald-500/15 text-emerald-300",
  warn: "bg-amber-500/15 text-amber-300",
  danger: "bg-rose-500/15 text-rose-300",
};

export function NotificationsClient({
  initialNotifications,
  initialTotal,
  initialTodayCount,
  initialUnreadCount,
  plans,
}: Props) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [todayCount, setTodayCount] = useState(initialTodayCount);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [total, setTotal] = useState(initialTotal);

  const [audience, setAudience] = useState("all_active");
  const [planId, setPlanId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/notifications?limit=50");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setTotal(data.total);
      setTodayCount(data.todayCount);
      setUnreadCount(data.unreadCount);
    }
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, title, body, type, ...(audience === "by_plan" ? { planId } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ type: "success", message: `${json.sent} üyeye bildirim gönderildi.` });
      setTitle("");
      setBody("");
      await refresh();
    } catch (err: any) {
      toast({ type: "error", message: err.message || "Gönderilemedi." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-body text-sm mb-2"><Bell className="w-4 h-4 text-neon" />Toplam</div>
          <div className="text-3xl font-bold">{total}</div>
          <div className="text-xs text-muted mt-0.5">tüm zamanlar</div>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-body text-sm mb-2"><Clock className="w-4 h-4 text-neon" />Bugün</div>
          <div className="text-3xl font-bold text-neon">{todayCount}</div>
          <div className="text-xs text-muted mt-0.5">gönderildi</div>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-body text-sm mb-2"><Users className="w-4 h-4 text-neon" />Okunmamış</div>
          <div className="text-3xl font-bold">{unreadCount}</div>
          <div className="text-xs text-muted mt-0.5">üye bekliyor</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 card-surface p-6">
          <div className="font-semibold mb-4 flex items-center gap-2"><Send className="w-4 h-4 text-neon" />Yeni Bildirim</div>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs text-body mb-1.5">Hedef Kitle</label>
              <select className="input w-full" value={audience} onChange={(e) => setAudience(e.target.value)}>
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {audience === "by_plan" && (
              <div>
                <label className="block text-xs text-body mb-1.5">Plan</label>
                <select className="input w-full" value={planId} onChange={(e) => setPlanId(e.target.value)} required>
                  <option value="">Plan seç</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-body mb-1.5">Tip</label>
              <div className="flex gap-2">
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      type === t.value ? TYPE_BADGE[t.value] + " ring-1 ring-current" : "bg-subtle text-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-body mb-1.5">Başlık</label>
              <input
                className="input w-full"
                placeholder="Yeni kampanya başladı!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs text-body mb-1.5">Mesaj</label>
              <textarea
                rows={4}
                className="input w-full resize-none"
                placeholder="Üyelerinize iletmek istediğiniz mesaj..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={sending} className="btn-primary btn-md w-full gap-2">
              <Send className="w-4 h-4" />
              {sending ? "Gönderiliyor…" : "Bildirimi Gönder"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-3 card-surface p-6">
          <div className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-neon" />
            Son Gönderilenler
            <span className="ml-auto text-xs text-muted">{notifications.length} kayıt</span>
          </div>
          <div className="overflow-y-auto max-h-[560px] space-y-2 pr-1">
            {notifications.length === 0 && (
              <div className="text-center py-12 text-faint text-sm">Henüz bildirim gönderilmedi</div>
            )}
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-subtle hover:bg-white/[0.05]">
                <span className={`mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider shrink-0 ${TYPE_BADGE[n.type] ?? "bg-subtle-md text-label"}`}>
                  {n.type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  <div className="text-xs text-muted truncate">{n.body}</div>
                  <div className="mt-1 text-[10px] text-faint">{n.user.name} · {formatDate(n.createdAt)}</div>
                </div>
                {n.readAt && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60 shrink-0 mt-0.5" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
