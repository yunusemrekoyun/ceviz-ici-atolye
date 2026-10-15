"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

function category(bmi: number) {
  if (bmi < 18.5) return { label: "Zayıf", color: "text-cyan-300", bg: "bg-cyan-500/15" };
  if (bmi < 25) return { label: "Normal", color: "text-emerald-300", bg: "bg-emerald-500/15" };
  if (bmi < 30) return { label: "Fazla Kilolu", color: "text-amber-300", bg: "bg-amber-500/15" };
  return { label: "Obez", color: "text-rose-300", bg: "bg-rose-500/15" };
}

export function BMICalculator() {
  const [h, setH] = useState(178);
  const [w, setW] = useState(75);

  const bmi = useMemo(() => {
    const m = h / 100;
    return +(w / (m * m)).toFixed(1);
  }, [h, w]);

  const cat = category(bmi);
  const pct = Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100));

  return (
    <section id="bmi" className="section">
      <div className="container-app">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-neon text-sm font-semibold tracking-wider uppercase flex items-center gap-2">
              <Activity className="w-4 h-4" /> BMI Hesaplayıcı
            </div>
            <h2 className="h-display text-4xl md:text-5xl mt-3">
              Vücut kitle indeksini <span className="text-gradient-neon">saniyeler içinde</span> öğren
            </h2>
            <p className="mt-4 text-body">
              Hedeflerini belirlemek için ilk adım. Anlık olarak hesapla, kategorini gör.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="card-surface p-8"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-base">Boy (cm)</label>
                <input
                  type="number"
                  value={h}
                  onChange={(e) => setH(+e.target.value)}
                  className="input-base"
                />
                <input
                  type="range" min={120} max={220} value={h}
                  onChange={(e) => setH(+e.target.value)}
                  className="mt-2 w-full accent-neon"
                />
              </div>
              <div>
                <label className="label-base">Kilo (kg)</label>
                <input
                  type="number"
                  value={w}
                  onChange={(e) => setW(+e.target.value)}
                  className="input-base"
                />
                <input
                  type="range" min={30} max={200} value={w}
                  onChange={(e) => setW(+e.target.value)}
                  className="mt-2 w-full accent-neon"
                />
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-baseline justify-between">
                <div className="text-sm text-body">BMI Sonucu</div>
                <span className={`badge ${cat.bg} ${cat.color} border-current/20`}>
                  {cat.label}
                </span>
              </div>
              <div className="mt-2 text-6xl font-bold text-gradient-neon">{bmi}</div>
              <div className="mt-4 h-2 rounded-full bg-subtle overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-neon to-rose-400 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-muted">
                <span>Zayıf</span><span>Normal</span><span>Fazla</span><span>Obez</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
