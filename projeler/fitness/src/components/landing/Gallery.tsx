"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface GalleryItem {
  id: string;
  url: string;
  caption: string | null;
}

interface Props {
  items: GalleryItem[];
}

export function Gallery({ items }: Props) {
  const [active, setActive] = useState<GalleryItem | null>(null);

  if (items.length === 0) return null;

  return (
    <section id="galeri" className="section">
      <div className="container-app">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-neon text-sm font-semibold tracking-wider uppercase">Salonumuz</div>
          <h2 className="h-display text-4xl md:text-5xl mt-3">
            Antrenman öncesi bir göz atın
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {items.map((item, i) => (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => setActive(item)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="relative aspect-square rounded-2xl overflow-hidden group border border-subtle"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.caption ?? "Baha Fitness"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {item.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-white font-medium">{item.caption}</span>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setActive(null)}
          >
            <button
              aria-label="Kapat"
              onClick={() => setActive(null)}
              className="absolute top-5 right-5 w-10 h-10 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              src={active.url}
              alt={active.caption ?? "Baha Fitness"}
              className="max-w-full max-h-[85vh] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {active.caption && (
              <div className="absolute bottom-6 text-center text-sm text-white/80">{active.caption}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
