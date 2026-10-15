"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, Dumbbell, Calendar,
  BarChart3, Settings, FileText, MessageSquare, Building2, Bot, Tag,
  ClipboardList, ScanLine, Home, Mail, Shield, ScrollText, MonitorSmartphone, Ticket, Apple,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  soon?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
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
      { href: "/admin/besinler", label: "Besin Kütüphanesi", icon: Apple },
      { href: "/admin/egitmenler", label: "Eğitmenler", icon: Dumbbell },
      { href: "/admin/subeler", label: "Şubeler", icon: Building2 },
      { href: "/admin/raporlar", label: "Raporlar", icon: BarChart3 },
    ],
  },
  {
    label: "İçerik & Pazarlama",
    items: [
      { href: "/admin/icerik", label: "Site İçeriği", icon: FileText },
      { href: "/admin/kuponlar", label: "Kuponlar", icon: Ticket },
      { href: "/admin/mesajlar", label: "Mesajlar", icon: Mail },
      { href: "/admin/mesajlasmalar", label: "Yazışmalar", icon: MessageSquare },
      { href: "/admin/bildirimler", label: "Bildirimler", icon: MessageSquare },
      { href: "/admin/ai-asistan", label: "AI Asistan", icon: Bot, soon: true },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/admin/ekip", label: "Ekip", icon: Shield },
      { href: "/admin/kayitlar", label: "İşlem Kayıtları", icon: ScrollText },
      { href: "/admin/oturumlar", label: "Oturumlar", icon: MonitorSmartphone },
      { href: "/admin/odeme-entegrasyonu", label: "Ödeme Entegrasyonu", icon: CreditCard },
      { href: "/admin/ayarlar", label: "Ayarlar", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-subtle bg-navbar backdrop-blur-xl no-print">
      <div className="h-16 px-6 flex items-center border-b border-subtle">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neon grid place-items-center shadow-glow">
            <Dumbbell className="w-4 h-4 text-ink-950" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">BahaFitness</div>
            <div className="text-[10px] text-muted -mt-0.5">Admin Paneli</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.label} className="mb-6">
            <div className="px-3 mb-2 text-[10px] font-semibold tracking-widest text-faint uppercase">
              {g.label}
            </div>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-neon/15 text-neon"
                        : "text-dim hover:text-white hover:bg-subtle"
                    )}
                  >
                    <it.icon className="w-4 h-4" />
                    <span className="flex-1">{it.label}</span>
                    {(it as any).soon && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-subtle-md text-muted">Yakında</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-2 border-t border-subtle pt-3">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-dim hover:text-white hover:bg-subtle transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Ana Sayfaya Dön</span>
        </Link>
      </div>

    </aside>
  );
}
