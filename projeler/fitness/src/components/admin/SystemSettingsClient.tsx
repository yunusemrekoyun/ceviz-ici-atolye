"use client";

import { useState } from "react";
import { Bell, UserPlus, Wrench, Save } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import type { SystemSettings } from "@/lib/settings";

interface Props {
  initialSettings: SystemSettings;
}

const TOGGLES = [
  {
    key: "system.autoRenewalAlerts",
    label: "Otomatik üyelik yenileme uyarıları",
    desc: "Üyeliğin bitişine 7 ve 3 gün kala üyeye bildirim gönderilir",
    icon: Bell,
  },
  {
    key: "system.newMemberRegistration",
    label: "Yeni üye kayıtları açık",
    desc: "Kapalıyken kayıt formu gizlenir ve kayıt isteği reddedilir",
    icon: UserPlus,
  },
  {
    key: "system.maintenanceMode",
    label: "Bakım modu",
    desc: "Admin dışındaki tüm sayfalara bakım ekranı gösterilir",
    icon: Wrench,
  },
];

export function SystemSettingsClient({ initialSettings }: Props) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TOGGLES.map((t) => [t.key, initialSettings[t.key as keyof SystemSettings]]))
  );
  const [saving, setSaving] = useState(false);

  function toggle(key: string) {
    setValues((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const settings = Object.entries(values).map(([key, val]) => ({
        key,
        value: String(val),
        group: "system",
        type: "text",
      }));
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ type: "success", message: "Sistem ayarları kaydedildi." });
    } catch (err: any) {
      toast({ type: "error", message: err.message || "Kaydedilemedi." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="card-surface p-6">
        <div className="font-semibold mb-5">Özellik Kontrolleri</div>
        <div className="divide-y divide-white/5">
          {TOGGLES.map(({ key, label, desc, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between py-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-subtle grid place-items-center shrink-0">
                  <Icon className="w-4 h-4 text-neon" />
                </div>
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted mt-0.5">{desc}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle(key)}
                className={`relative w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${values[key] ? "bg-neon" : "bg-subtle-md"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${values[key] ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary btn-md gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Kaydediliyor…" : "Ayarları Kaydet"}
        </button>
      </div>
    </form>
  );
}
