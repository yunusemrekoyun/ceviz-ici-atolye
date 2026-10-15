import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Dumbbell, Home, Users, Calendar, Clock, BookOpen, MessageCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutBtn } from "./LogoutBtn";
import { EgitmenMobileNav } from "./EgitmenMobileNav";
import { initials } from "@/lib/utils";

const navItems = [
  { href: "/egitmen",             label: "Dashboard",  icon: Home },
  { href: "/egitmen/uyelerim",    label: "Üyelerim",   icon: Users },
  { href: "/egitmen/mesajlar",    label: "Mesajlar",   icon: MessageCircle },
  { href: "/egitmen/programlar",  label: "Programlar", icon: Dumbbell },
  { href: "/egitmen/randevular",  label: "Randevular", icon: Calendar },
  { href: "/egitmen/musaitlik",   label: "Müsaitlik",  icon: Clock },
  { href: "/egitmen/derslerim",   label: "Derslerim",  icon: BookOpen },
];

export default async function EgitmenLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["TRAINER"]);

  const trainer = await prisma.trainer.findUnique({
    where: { userId: user.sub },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!trainer) redirect("/giris");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-40 h-16 border-b border-subtle bg-navbar backdrop-blur-xl">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link href="/egitmen" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-neon grid place-items-center shadow-glow">
              <Dumbbell className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold hidden sm:block">
              Baha<span className="text-neon">Fitness</span>
            </span>
            <span className="text-xs text-muted hidden sm:block">· Eğitmen Paneli</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-dim hover:text-primary rounded-lg hover:bg-subtle transition-colors"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/egitmen/profil"
              title="Profilim"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-subtle border border-subtle hover:border-neon/40 transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 text-[10px] font-bold">
                {initials(trainer.user.name)}
              </div>
              <span className="text-sm font-medium hidden sm:block">{trainer.user.name}</span>
            </Link>
            <LogoutBtn />
          </div>
        </div>
      </header>

      <main className="flex-1 container-app py-8 pb-24 lg:pb-8">
        {children}
      </main>

      <EgitmenMobileNav />
    </div>
  );
}
