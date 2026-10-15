"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Activity, Calendar, CreditCard, User, MessageCircle, Apple } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/panel",           label: "Ana Sayfa", icon: Home,        exact: true },
  { href: "/panel/antrenman", label: "Antrenman",  icon: Activity },
  { href: "/panel/beslenme",  label: "Beslenme",   icon: Apple },
  { href: "/panel/dersler",   label: "Dersler",    icon: Calendar },
  { href: "/panel/mesajlar",  label: "Mesajlar",   icon: MessageCircle },
  { href: "/panel/uyeligim",  label: "Üyeliğim",   icon: CreditCard },
  { href: "/panel/profil",    label: "Profil",     icon: User },
];

export function PanelMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-subtle bg-navbar backdrop-blur-xl">
      <div className="flex items-stretch h-16">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                active ? "text-neon" : "text-muted hover:text-dim"
              )}>
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
