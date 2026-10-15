"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="section">
      <div className="container-app">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="cta-card relative overflow-hidden rounded-3xl p-10 md:p-16 text-center"
        >
          <div className="cta-blob absolute -top-20 -right-20 w-80 h-80 rounded-full bg-neon/30 blur-[100px]" />
          <div className="cta-blob absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-accent-violet/20 blur-[100px]" />

          <div className="relative">
            <h2 className="h-display text-4xl md:text-6xl">
              Bugün başla. <span className="text-gradient-neon">Yarın fark et.</span>
            </h2>
            <p className="mt-5 text-dim max-w-xl mx-auto">
              7 gün ücretsiz dene, hayatını değiştirecek bu yolculuğa risksiz adım at.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/kayit" className="btn-primary btn-lg">
                Ücretsiz Hesap Oluştur
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#iletisim" className="btn-outline btn-lg">Bize Ulaş</a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
