"use client";

import { useRouter } from "next/navigation";
import { Bell, Search, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";
import { initials } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

type Props = {
  user: { name: string; email: string; role: string };
  unreadCount: number;
};

export function Topbar({ user, unreadCount }: Props) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/giris");
    router.refresh();
  };

  return (
    <header className="h-16 border-b border-subtle bg-navbar backdrop-blur-xl sticky top-0 z-40 no-print">
      <div className="h-full px-4 sm:px-6 flex items-center gap-3">
        {/* Sol boşluk */}
        <div className="flex-1" />

        {/* Orta: arama */}
        <div className="w-full max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input
              placeholder="Üye, ödeme, randevu ara..."
              className="w-full bg-[var(--bg-input)] border border-subtle rounded-xl pl-9 pr-3 py-2 text-sm placeholder:text-faint focus:outline-none focus:border-neon/40 transition-colors"
            />
          </div>
        </div>

        {/* Sağ: aksiyonlar */}
        <div className="flex-1 flex items-center justify-end gap-1.5">
          <ThemeToggle />

          <button
            onClick={() => router.push("/admin/bildirimler")}
            className="relative w-9 h-9 grid place-items-center rounded-lg hover:bg-subtle"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] rounded-full bg-neon text-ink-950 text-[9px] font-bold grid place-items-center px-0.5">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setMenu((v) => !v)}
              className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl hover:bg-subtle"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 text-xs font-bold">
                {initials(user.name)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium leading-tight">{user.name}</div>
                <div className="text-[10px] text-muted leading-tight">{user.role}</div>
              </div>
              <ChevronDown className="w-3 h-3 text-muted" />
            </button>

            {menu && (
              <div className="absolute right-0 mt-2 w-56 card-surface p-2 z-50">
                <div className="px-3 py-2 border-b border-subtle">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-label">{user.email}</div>
                </div>
                <button
                  onClick={logout}
                  className="mt-1 w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-rose-300 hover:bg-rose-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  Çıkış yap
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
