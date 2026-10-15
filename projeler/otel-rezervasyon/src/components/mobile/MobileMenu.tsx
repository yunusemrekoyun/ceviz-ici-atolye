'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, Home, BedDouble, Star, MapPin, User } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

// Slide-over navigation drawer opened from the header hamburger.
export function MobileMenu({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}) {
  const { language, setLanguage } = useLanguage();
  const tr = language === 'tr';

  const items = [
    { id: 'home', icon: Home, label: tr ? 'Ana Sayfa' : 'Home' },
    { id: 'rooms', icon: BedDouble, label: tr ? 'Odalar' : 'Rooms' },
    { id: 'reviews', icon: Star, label: tr ? 'Yorumlar' : 'Reviews' },
    { id: 'contact', icon: MapPin, label: tr ? 'İletişim' : 'Contact' },
    { id: 'profile', icon: User, label: tr ? 'Profil' : 'Profile' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="absolute right-0 top-0 flex h-dvh w-[80%] max-w-xs flex-col border-l border-hotel-border bg-hotel-surface p-6 shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="font-serif text-xl font-bold text-hotel-text-primary">
                {tr ? 'Menü' : 'Menu'}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label={tr ? 'Kapat' : 'Close'}
                className="grid h-9 w-9 place-items-center rounded-full bg-hotel-surface-2 text-hotel-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    onNavigate(it.id);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-hotel text-hotel-text-primary transition-colors hover:bg-hotel-surface-2"
                >
                  <it.icon size={20} className="text-hotel-peach" />
                  {it.label}
                </button>
              ))}
            </nav>

            <div className="flex gap-2 border-t border-hotel-border pt-4">
              <button
                type="button"
                onClick={() => setLanguage('tr')}
                className={`flex-1 rounded-xl py-2.5 font-hotel text-sm transition-colors ${
                  tr ? 'bg-hotel-beige text-hotel-text-on-beige' : 'border border-hotel-border text-hotel-text-muted'
                }`}
              >
                Türkçe
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex-1 rounded-xl py-2.5 font-hotel text-sm transition-colors ${
                  !tr ? 'bg-hotel-beige text-hotel-text-on-beige' : 'border border-hotel-border text-hotel-text-muted'
                }`}
              >
                English
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
