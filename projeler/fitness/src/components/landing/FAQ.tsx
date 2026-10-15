"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const faqs = [
  { q: "Üyelik için yaş sınırı var mı?", a: "16 yaş üstü herkes üye olabilir. 16-18 yaş arası için veli onayı gereklidir." },
  { q: "7 gün ücretsiz deneme nasıl çalışıyor?", a: "Hiçbir kart bilgisi vermeden ücretsiz hesap oluşturup 7 gün boyunca tesisimizi kullanabilirsin. Memnun kalırsan dilediğin planı seçersin." },
  { q: "Üyeliğimi dondurabilir miyim?", a: "Evet. Tatil, sağlık veya askerlik gibi durumlarda üyeliğini panel üzerinden istediğin zaman dondurabilirsin." },
  { q: "Kişisel antrenör desteği dahil mi?", a: "Yıllık Premium plana 4 seans/ay kişisel antrenör dahildir. Diğer planlarda ek paket olarak satın alınabilir." },
  { q: "İptal ve iade politikanız nedir?", a: "İlk 14 gün içinde herhangi bir sebep belirtmeden iptal edip tam iade alabilirsin." },
  { q: "Mobil uygulamanız var mı?", a: "iOS ve Android için yakında PWA olarak çıkıyor. Şu an web üzerinden mobil deneyim sunuyoruz." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="section">
      <div className="container-app max-w-3xl">
        <div className="text-center">
          <div className="text-neon text-sm font-semibold tracking-wider uppercase">Sıkça Sorulanlar</div>
          <h2 className="h-display text-4xl md:text-5xl mt-3">Aklındaki sorular</h2>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="card-surface overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-subtle"
                >
                  <span className="font-medium pr-4">{f.q}</span>
                  <Plus className={`w-5 h-5 text-neon shrink-0 transition-transform ${isOpen ? "rotate-45" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-5 pb-5 text-sm text-dim leading-relaxed">{f.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
