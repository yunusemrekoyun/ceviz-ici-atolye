"use client";

import { motion } from "framer-motion";
import { Activity, Bot, CalendarCheck, Dumbbell, HeartPulse, QrCode, ShieldCheck, Users } from "lucide-react";

const features = [
  { icon: Dumbbell, title: "Premium Ekipman", desc: "Technogym, Hammer Strength ve Eleiko ekipmanlarıyla kuvvetini bir üst seviyeye taşı." },
  { icon: Users, title: "Uzman Antrenörler", desc: "Uluslararası sertifikalı 45+ antrenör, kişiye özel programlar tasarlar." },
  { icon: HeartPulse, title: "InBody Analiz", desc: "Aylık vücut kompozisyon analizi ile gelişimini metrik metrik takip et." },
  { icon: Bot, title: "AI Destekli Program", desc: "Yapay zekâ asistanı seninle birlikte antrenman ve beslenme planı oluşturur." },
  { icon: QrCode, title: "QR ile Hızlı Giriş", desc: "Üye kartını telefonundan göster, kapıdan saniyeler içinde geç." },
  { icon: CalendarCheck, title: "Akıllı Randevu", desc: "Antrenör müsaitlik takvimini gör, anında randevunu al." },
  { icon: Activity, title: "İlerleme Takibi", desc: "Kilo, ölçü, antrenman geçmişini tek panelden takip et." },
  { icon: ShieldCheck, title: "Güvenli Ödeme", desc: "iyzico ve PayTR ile 3D Secure korumalı, güvenli online ödeme." },
];

export function Features() {
  return (
    <section className="section relative">
      <div className="container-app">
        <div className="max-w-2xl">
          <div className="text-neon text-sm font-semibold tracking-wider uppercase">Neden Biz</div>
          <h2 className="h-display text-4xl md:text-5xl mt-3">
            Sıradan bir spor salonu değil, <span className="text-gradient-neon">tam donanımlı bir performans laboratuvarı.</span>
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="card-surface p-6 group hover:border-neon/30 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-neon/20 to-neon/5 border border-neon/20 grid place-items-center mb-4 group-hover:shadow-glow transition-shadow">
                <f.icon className="w-5 h-5 text-neon" />
              </div>
              <div className="font-semibold">{f.title}</div>
              <div className="text-sm text-body mt-1.5 leading-relaxed">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
