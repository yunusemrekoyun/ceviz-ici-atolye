"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/#galeri", label: "Galeri" },
  { href: "/#planlar", label: "Üyelikler" },
  { href: "/#egitmenler", label: "Eğitmenler" },
  { href: "/#program", label: "Ders Programı" },
  { href: "/#bmi", label: "BMI" },
  { href: "/blog", label: "Blog" },
  { href: "/#iletisim", label: "İletişim" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled ? "bg-navbar backdrop-blur-xl border-b border-subtle" : "bg-transparent"
      )}
    >
      <div className="container-app flex items-center justify-between h-16 md:h-20">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-neon flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <Dumbbell className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold tracking-tight text-lg">
            Baha<span className="text-neon">Fitness</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-4 py-2 text-sm text-dim hover:text-white rounded-lg hover:bg-subtle transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <ThemeToggle />
          <Link href="/giris" className="btn-ghost btn-md">Giriş</Link>
          <Link href="/kayit" className="btn-primary btn-md">Üye Ol</Link>
        </div>

        <button
          aria-label="Menü"
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden w-10 h-10 grid place-items-center rounded-lg hover:bg-subtle"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-subtle bg-navbar backdrop-blur-xl"
          >
            <div className="container-app py-4 flex flex-col gap-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 text-sm text-strong rounded-lg hover:bg-subtle"
                >
                  {l.label}
                </a>
              ))}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Link href="/giris" className="btn-secondary btn-md">Giriş</Link>
                <Link href="/kayit" className="btn-primary btn-md">Üye Ol</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
