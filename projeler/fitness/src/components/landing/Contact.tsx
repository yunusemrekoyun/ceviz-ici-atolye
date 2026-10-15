"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, MessageCircle, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
  whatsapp: string | null;
  mapUrl: string | null;
}

function waLink(whatsapp: string) {
  const digits = whatsapp.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
}

export function Contact({ phone, email, address, hours, whatsapp, mapUrl }: Props) {
  const hasInfo = Boolean(address || hours || phone || email || whatsapp);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gönderilemedi");
      setSent(true);
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gönderilemedi");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="iletisim" className="section">
      <div className="container-app">
        <div className="max-w-2xl">
          <div className="text-neon text-sm font-semibold tracking-wider uppercase">İletişim</div>
          <h2 className="h-display text-4xl md:text-5xl mt-3">Sorularını yanıtlayalım</h2>
        </div>

        <div className={`mt-12 grid gap-8 ${hasInfo ? "lg:grid-cols-2" : "lg:grid-cols-1 max-w-xl"}`}>
          {hasInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <div className="card-surface p-6 space-y-4">
                {address && (
                  <div className="flex items-start gap-3 text-sm text-body">
                    <MapPin className="w-4 h-4 mt-0.5 text-neon shrink-0" />
                    {address}
                  </div>
                )}
                {hours && (
                  <div className="flex items-start gap-3 text-sm text-body">
                    <Clock className="w-4 h-4 mt-0.5 text-neon shrink-0" />
                    <span className="whitespace-pre-line">{hours}</span>
                  </div>
                )}
                {phone && (
                  <a href={`tel:${phone}`} className="flex items-center gap-3 text-sm text-body hover:text-white">
                    <Phone className="w-4 h-4 text-neon shrink-0" />
                    {phone}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-3 text-sm text-body hover:text-white">
                    <Mail className="w-4 h-4 text-neon shrink-0" />
                    {email}
                  </a>
                )}
                {whatsapp && (
                  <a
                    href={waLink(whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary btn-md w-full flex items-center justify-center gap-2 mt-2"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp'tan Yaz
                  </a>
                )}
              </div>

              {mapUrl && (
                <div className="card-surface overflow-hidden aspect-video">
                  <iframe
                    src={mapUrl}
                    title="Konum"
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="card-surface p-6"
          >
            {sent ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 gap-3">
                <CheckCircle2 className="w-10 h-10 text-neon" />
                <div className="font-semibold">Mesajın ulaştı</div>
                <p className="text-sm text-muted max-w-xs">En kısa sürede seninle iletişime geçeceğiz.</p>
                <button onClick={() => setSent(false)} className="btn-secondary btn-sm mt-2">Yeni mesaj gönder</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="text-sm text-rose-300">{error}</div>}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-body mb-1.5">Ad Soyad *</label>
                    <input required className="input w-full" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-body mb-1.5">Telefon</label>
                    <input className="input w-full" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">E-posta *</label>
                  <input required type="email" className="input w-full" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Mesajın *</label>
                  <textarea required rows={5} className="input w-full resize-none" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
                </div>
                <button type="submit" disabled={sending} className="btn-primary btn-md w-full">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Mesaj Gönder"}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
