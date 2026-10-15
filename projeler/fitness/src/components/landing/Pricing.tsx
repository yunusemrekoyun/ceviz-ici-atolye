"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles, ChevronDown } from "lucide-react";
import { formatTRY } from "@/lib/utils";
import type { Plan } from "@/types";

const INTERVAL_LABEL: Record<string, string> = {
  MONTHLY: "/ay",
  QUARTERLY: "/ 3 ay",
  YEARLY: "/ yıl",
  ONE_TIME: "",
};

const CTA_LABEL: Record<string, string> = {
  MONTHLY: "Hemen Başla",
  QUARTERLY: "Avantajı Yakala",
  YEARLY: "Premium'a Geç",
  ONE_TIME: "Satın Al",
};

interface Props {
  plans: Plan[];
}

export function Pricing({ plans }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section id="planlar" className="section relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="container-app">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-neon text-sm font-semibold tracking-wider uppercase">Üyelik Planları</div>
          <h2 className="h-display text-4xl md:text-5xl mt-3">
            Hedefine uygun planı seç
          </h2>
          <p className="mt-4 text-body">
            Tüm planlarda 7 gün ücretsiz deneme. Taahhüt yok, dilediğin zaman iptal.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-3xl p-8 border ${
                p.isPopular
                  ? "bg-gradient-to-b from-neon/10 to-transparent border-neon/40 shadow-glow"
                  : "card-surface"
              }`}
            >
              {p.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-neon text-ink-950 text-xs font-bold shadow-glow">
                  <Sparkles className="w-3 h-3" />
                  EN POPÜLER
                </div>
              )}

              <div className="font-semibold text-strong">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <div className={`text-5xl font-bold ${p.isPopular ? "text-gradient-neon" : "text-strong"}`}>
                  {formatTRY(p.price)}
                </div>
                <div className="text-muted text-sm">{INTERVAL_LABEL[p.interval]}</div>
              </div>
              {p.description && (
                <p className="mt-2 text-sm text-body">{p.description}</p>
              )}

              <Link
                href="/kayit"
                className={`mt-6 w-full ${p.isPopular ? "btn-primary" : "btn-secondary"} btn-md`}
              >
                {CTA_LABEL[p.interval] ?? "Hemen Başla"}
              </Link>

              <ul className="mt-8 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <div className="mt-0.5 w-4 h-4 rounded-full bg-neon/20 grid place-items-center shrink-0">
                      <Check className="w-3 h-3 text-neon" strokeWidth={3} />
                    </div>
                    <span className="text-dim">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setExpanded((cur) => (cur === p.id ? null : p.id))}
                className="mt-6 w-full flex items-center justify-between text-xs text-muted hover:text-white transition-colors border-t border-subtle pt-4"
              >
                Detaylar (süre, iptal koşulları)
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded === p.id ? "rotate-180" : ""}`} />
              </button>

              {expanded === p.id && (
                <div className="mt-3 space-y-2 text-xs text-muted">
                  <p>Plan süresi: <span className="text-body">{p.durationDays} gün</span>, otomatik yenilenmez — süre bitiminde panelden tekrar ödeme yaparsın.</p>
                  <p>İlk 14 gün içinde gerekçe belirtmeksizin iptal edip tam iade alabilirsin. 14 günden sonra kalan gün iadesi yapılmaz.</p>
                  <Link href="/kullanim-sartlari" className="inline-block text-neon hover:underline" target="_blank" rel="noopener noreferrer">
                    Tüm şartları oku →
                  </Link>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
