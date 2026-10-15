"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

interface TestimonialItem {
  id: string;
  name: string;
  role: string | null;
  content: string;
  rating: number;
}

interface Props {
  items: TestimonialItem[];
}

export function Testimonials({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="section bg-gradient-to-b from-transparent via-ink-900/40 to-transparent">
      <div className="container-app">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-neon text-sm font-semibold tracking-wider uppercase">Üye Yorumları</div>
          <h2 className="h-display text-4xl md:text-5xl mt-3">
            12.000+ üye konuşuyor
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="card-surface p-6"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, k) => (
                  <Star key={k} className="w-4 h-4 fill-neon text-neon" />
                ))}
              </div>
              <p className="mt-4 text-sm text-strong leading-relaxed">"{t.content}"</p>
              <div className="mt-5 pt-5 border-t border-subtle">
                <div className="font-semibold text-sm">{t.name}</div>
                {t.role && <div className="text-xs text-label">{t.role}</div>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
