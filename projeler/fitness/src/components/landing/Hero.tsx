"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";

interface HeroStats {
  members: number;
  trainers: number;
  todayCheckIns: number;
}

interface Props {
  stats: HeroStats;
}

export function Hero({ stats }: Props) {
  const metrics = [
    { v: stats.members > 1000 ? `${(stats.members / 1000).toFixed(0)}K+` : `${stats.members}+`, l: "Aktif Üye" },
    { v: `${stats.trainers}+`, l: "Uzman Antrenör" },
    { v: "98%", l: "Memnuniyet" },
    { v: "24/7", l: "Açık" },
  ];

  return (
    <section className="relative pt-32 md:pt-40 pb-20 md:pb-32 overflow-hidden">
      {/* arka plan ışıkları */}
      <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-neon/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full bg-accent-violet/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent-cyan/10 blur-[120px] pointer-events-none" />

      <div className="container-app relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-strong">
            <Sparkles className="w-3.5 h-3.5 text-neon" />
            Türkiye'nin En Hızlı Büyüyen Premium Fitness Markası
          </div>

          <h1 className="h-display mt-6 text-5xl sm:text-6xl md:text-7xl lg:text-8xl">
            Vücudunu{" "}
            <span className="text-gradient-neon">yeniden tasarla.</span>
            <br className="hidden sm:block" />
            <span className="text-strong">Limitlerini aş.</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-body max-w-2xl">
            Premium ekipmanlar, dünya standartlarında antrenörler, akıllı analitik ve
            kişiye özel programlarla fitness hayatın bambaşka bir boyuta geçsin.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link href="/kayit" className="btn-primary btn-lg group">
              7 Gün Ücretsiz Dene
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a href="#planlar" className="btn-secondary btn-lg">
              <PlayCircle className="w-4 h-4" />
              Üyelikleri Gör
            </a>
          </div>

          {/* metrikler */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl"
          >
            {metrics.map((m) => (
              <div key={m.l} className="card-surface p-4 md:p-6">
                <div className="text-2xl md:text-3xl font-bold text-gradient-neon">{m.v}</div>
                <div className="text-xs md:text-sm text-label mt-1">{m.l}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* hero showcase */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 md:mt-28 relative"
        >
          <div className="relative mx-auto max-w-5xl rounded-3xl overflow-hidden border border-subtle-md shadow-glow-soft">
            <div className="absolute inset-0 bg-gradient-to-tr from-ink-950 via-transparent to-neon/10 pointer-events-none z-10" />
            <img
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80"
              alt="Premium gym"
              className="w-full h-[300px] md:h-[520px] object-cover"
            />
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between z-20">
              <div className="glass-strong rounded-2xl p-4 max-w-xs">
                <div className="text-xs text-neon font-medium">BUGÜN CHECK-IN</div>
                <div className="text-2xl font-bold mt-1">{stats.todayCheckIns} kişi antrenman yaptı</div>
              </div>
              <div className="hidden md:flex glass-strong rounded-2xl p-4 gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-neon animate-pulse-glow" />
                <div>
                  <div className="text-xs text-label">Aktif Üye</div>
                  <div className="text-sm font-semibold">{stats.members} kişi</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
