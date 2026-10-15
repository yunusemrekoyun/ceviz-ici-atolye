'use client';

import { useState, type FormEvent } from 'react';
import { Phone, Mail, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { ScreenHeader } from '../ScreenHeader';

// Contact — design-refs/refs.pdf pages 13-14:
// map preview + phone/email/address rows + "Mesaj Gönderin" form (→ /api/contact).
export function MobileContact({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const tr = language === 'tr';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState('');

  const rows = [
    { icon: Phone, value: '+90 274 123 45 67', href: 'tel:+902741234567' },
    { icon: Mail, value: 'info@kutahyagardenotel.com', href: 'mailto:info@kutahyagardenotel.com' },
    { icon: MapPin, value: 'Cumhuriyet Cad. No:1, Kütahya Merkez', href: null as string | null },
  ];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          category: tr ? 'Genel' : 'General',
          message: message.trim(),
        }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) {
        setSent(d.ticketId ?? '');
        setName('');
        setEmail('');
        setMessage('');
      } else {
        setError(d?.message ?? (tr ? 'Mesaj gönderilemedi.' : 'Message could not be sent.'));
      }
    } catch {
      setError(tr ? 'Bağlantı hatası.' : 'Connection error.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 px-4 py-5">
      <ScreenHeader
        eyebrow={tr ? 'İletişim' : 'Contact'}
        title={tr ? 'İletişim & Konum' : 'Contact & Location'}
        onBack={onBack}
        backLabel={tr ? 'Geri' : 'Back'}
        size="h2"
      />

      {/* Map */}
      <iframe
        title="map"
        src="https://maps.google.com/maps?q=K%C3%BCtahya%20Merkez&z=14&output=embed"
        loading="lazy"
        className="h-48 w-full rounded-2xl border border-hotel-border"
      />

      {/* Contact rows */}
      <div className="space-y-3">
        {rows.map((r) => {
          const inner = (
            <>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-hotel-peach text-hotel-bg">
                <r.icon size={20} />
              </span>
              <span className="font-hotel text-sm text-hotel-text-primary">{r.value}</span>
            </>
          );
          const cls = 'flex items-center gap-3 rounded-2xl border border-hotel-border bg-hotel-surface p-3';
          return r.href ? (
            <a key={r.value} href={r.href} className={cls}>
              {inner}
            </a>
          ) : (
            <div key={r.value} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* Message form */}
      <form onSubmit={submit} className="card-hotel space-y-4 p-5">
        <h2 className="font-serif text-2xl font-bold text-hotel-text-primary">
          {tr ? 'Mesaj Gönderin' : 'Send a Message'}
        </h2>

        {sent !== null ? (
          <div className="flex items-start gap-3 rounded-2xl border border-hotel-peach/30 bg-hotel-peach/10 p-4">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-hotel-peach" />
            <p className="font-hotel text-sm text-hotel-text-primary">
              {tr ? 'Mesajınız alındı.' : 'Your message has been received.'}
              {sent && (
                <>
                  {' '}
                  {tr ? 'Bilet no:' : 'Ticket:'} <span className="font-mono text-hotel-peach">{sent}</span>
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            <input
              className="input-hotel"
              placeholder={tr ? 'Adınız Soyadınız' : 'Your full name'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              className="input-hotel"
              placeholder={tr ? 'E-posta Adresiniz' : 'Your email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <textarea
              className="input-hotel min-h-[120px] py-3"
              placeholder={tr ? 'Mesajınız' : 'Your message'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {error && <p className="font-hotel text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !name.trim() || !message.trim()}
              className="btn-hotel disabled:opacity-40"
            >
              {submitting ? (tr ? 'Gönderiliyor…' : 'Sending…') : `${tr ? 'Gönder' : 'Send'} →`}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
