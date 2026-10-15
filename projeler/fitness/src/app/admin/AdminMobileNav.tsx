"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, Calendar, ScanLine, Menu, X,
  Dumbbell, BarChart3, Settings, Tag, FileText, MessageSquare,
  Building2, ClipboardList, Bot, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const BOTTOM = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/uyeler", label: "Üyeler", icon: Users },
  { href: "/admin/odemeler", label: "Ödemeler", icon: CreditCard },
  { href: "/admin/qr-tarama", label: "QR", icon: ScanLine },
];

const ALL_GROUPS = [
  {
    label: "Genel",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/uyeler", label: "Üyeler", icon: Users },
      { href: "/admin/planlar", label: "Üyelik Planları", icon: Tag },
      { href: "/admin/odemeler", label: "Ödemeler", icon: CreditCard },
      { href: "/admin/randevular", label: "Randevular", icon: Calendar },
    ],
  },
  {
    label: "Operasyon",
    items: [
      { href: "/admin/yoklama", label: "Yoklama", icon: ClipboardList },
      { href: "/admin/qr-tarama", label: "QR Tarayıcı", icon: ScanLine },
      { href: "/admin/dersler", label: "Grup Dersler", icon: Calendar },
      { href: "/admin/programlar", label: "Antrenman Programları", icon: Dumbbell },
      { href: "/admin/egitmenler", label: "Eğitmenler", icon: Dumbbell },
      { href: "/admin/subeler", label: "Şubeler", icon: Building2 },
      { href: "/admin/raporlar", label: "Raporlar", icon: BarChart3 },
    ],
  },
  {
    label: "İçerik & Pazarlama",
    items: [
      { href: "/admin/icerik", label: "Site İçeriği", icon: FileText },
      { href: "/admin/mesajlar", label: "Mesajlar", icon: Mail },
      { href: "/admin/bildirimler", label: "Bildirimler", icon: MessageSquare },
      { href: "/admin/ai-asistan", label: "AI Asistan", icon: Bot },
    ],
  },
  {
    label: "Sistem",
    items: [{ href: "/admin/ayarlar", label: "Ayarlar", icon: Settings }],
  },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-navbar backdrop-blur-xl border-t border-subtle safe-bottom no-print">
        <div className="flex items-center">
          {BOTTOM.map((it) => {
            const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] transition-colors",
                  active ? "text-neon" : "text-muted hover:text-white"
                )}
              >
                <it.icon className="w-5 h-5" />
                {it.label}
              </Link>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-[10px] text-muted hover:text-white"
          >
            <Menu className="w-5 h-5" />
            Daha Fazla
          </button>
        </div>
      </nav>

      {/* Full menu drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
              <span className="font-semibold">Menü</span>
              <button onClick={() => setOpen(false)} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-subtle">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="p-3 pb-8">
              {ALL_GROUPS.map((g) => (
                <div key={g.label} className="mb-5">
                  <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-faint uppercase">
                    {g.label}
                  </div>
                  <div className="space-y-0.5">
                    {g.items.map((it) => {
                      const active = (it as any).exact ? pathname === it.href : pathname.startsWith(it.href);
                      return (
                        <Link
                          key={it.href}
                          href={it.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                            active ? "bg-neon/15 text-neon" : "text-dim hover:text-white hover:bg-subtle"
                          )}
                        >
                          <it.icon className="w-4 h-4" />
                          {it.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
