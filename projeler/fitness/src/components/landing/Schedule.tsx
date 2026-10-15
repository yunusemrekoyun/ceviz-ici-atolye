"use client";

import { motion } from "framer-motion";
import { Clock, Users } from "lucide-react";

interface ScheduleItem {
  id: string;
  title: string;
  trainerName: string | null;
  capacity: number;
  durationMin: number;
  color: string;
  startAt: string;
}

interface Props {
  items: ScheduleItem[];
}

function formatDay(iso: string) {
  const label = new Date(iso).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export function Schedule({ items }: Props) {
  if (items.length === 0) return null;

  const grouped = new Map<string, ScheduleItem[]>();
  for (const c of items) {
    const day = new Date(c.startAt).toDateString();
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(c);
  }
  const days = Array.from(grouped.entries()).slice(0, 7);

  return (
    <section id="program" className="section">
      <div className="container-app">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div className="max-w-xl">
            <div className="text-neon text-sm font-semibold tracking-wider uppercase">Ders Programı</div>
            <h2 className="h-display text-4xl md:text-5xl mt-3">
              Bu hafta hangi ders, ne zaman?
            </h2>
          </div>
          <a href="/kayit" className="btn-outline btn-md hidden md:inline-flex">Üye Ol, Yerini Ayırt</a>
        </div>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {days.map(([day, dayClasses], i) => (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="card-surface p-5"
            >
              <div className="text-sm font-semibold text-dim mb-3">{formatDay(dayClasses[0].startAt)}</div>
              <div className="space-y-2.5">
                {dayClasses.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-subtle p-3" style={{ borderLeftColor: c.color, borderLeftWidth: 3 }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{c.title}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(c.startAt)} · {c.durationMin} dk</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.capacity} kişi</span>
                      </div>
                      {c.trainerName && <div className="text-xs text-faint mt-0.5">{c.trainerName}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <a href="/kayit" className="btn-outline btn-md">Üye Ol, Yerini Ayırt</a>
        </div>
        <p className="mt-6 text-center text-xs text-faint">
          Yerini ayırtmak ve ders için check-in yapmak üyelik gerektirir.
        </p>
      </div>
    </section>
  );
}
