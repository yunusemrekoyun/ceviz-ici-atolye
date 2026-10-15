"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Dumbbell, Calendar, BookOpen, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/egitmen",            label: "Anasayfa",   icon: Home },
  { href: "/egitmen/uyelerim",   label: "Üyelerim",   icon: Users },
  { href: "/egitmen/mesajlar",   label: "Mesajlar",   icon: MessageCircle },
  { href: "/egitmen/randevular", label: "Randevular", icon: Calendar },
  { href: "/egitmen/derslerim",  label: "Derslerim",  icon: BookOpen },
  { href: "/egitmen/programlar", label: "Programlar", icon: Dumbbell },
];

export function EgitmenMobileNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-navbar backdrop-blur-xl border-t border-subtle">
      <div className="grid grid-cols-6 h-16">
        {items.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/egitmen" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
                active ? "text-neon" : "text-muted hover:text-dim"
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
