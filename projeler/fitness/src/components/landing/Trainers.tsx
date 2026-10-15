"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { initials } from "@/lib/utils";

interface TrainerData {
  id: string;
  specialty: string | null;
  experience: number;
  rating: number;
  user: { name: string; avatarUrl: string | null };
}

export function Trainers({ trainers }: { trainers: TrainerData[] }) {
  return (
    <section id="egitmenler" className="section">
      <div className="container-app">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div className="max-w-xl">
            <div className="text-neon text-sm font-semibold tracking-wider uppercase">Eğitmen Kadromuz</div>
            <h2 className="h-display text-4xl md:text-5xl mt-3">
              Seninle aynı tutkuyu paylaşan profesyoneller
            </h2>
          </div>
          <a href="#planlar" className="btn-outline btn-md hidden md:inline-flex">Planları Gör</a>
        </div>

        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {trainers.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Link href={`/egitmenler/${t.id}`} className="group relative block rounded-2xl overflow-hidden border border-subtle-md bg-card">
                <div className="aspect-[3/4] overflow-hidden bg-gradient-to-br from-neon/10 to-accent-cyan/10 flex items-center justify-center">
                  {t.user.avatarUrl ? (
                    <img src={t.user.avatarUrl} alt={t.user.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 text-3xl font-bold">
                      {initials(t.user.name)}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full glass text-xs">
                  <Star className="w-3 h-3 fill-neon text-neon" />
                  {Number(t.rating).toFixed(1)}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="font-semibold">{t.user.name}</div>
                  <div className="text-xs text-body flex items-center justify-between mt-1">
                    <span>{t.specialty?.split("/")[0]?.trim() || "Antrenör"}</span>
                    <span className="text-neon">{t.experience} yıl</span>
                  </div>
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="btn-primary btn-sm w-full text-center">Profili Gör</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
