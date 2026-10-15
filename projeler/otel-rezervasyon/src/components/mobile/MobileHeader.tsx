'use client';

import { Menu } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

// Header shared across every mobile screen (design-refs/refs.pdf):
// circle-G monogram + "Kütahya / Garden Otel" on two lines · TR/EN toggle · hamburger.
export function MobileHeader({
  onMenuClick,
  onLogoClick,
}: {
  onMenuClick?: () => void;
  onLogoClick?: () => void;
}) {
  const { language, setLanguage } = useLanguage();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-hotel-border-muted bg-hotel-bg px-4">
      {/* Brand */}
      <button
        type="button"
        onClick={onLogoClick}
        className="flex min-w-0 items-center gap-2.5 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hotel-text-primary/40">
          <span className="font-serif text-lg leading-none text-hotel-text-primary">G</span>
        </span>
        <span className="font-hotel text-[13px] font-medium leading-tight text-hotel-text-primary">
          Kütahya
          <br />
          Garden Otel
        </span>
      </button>

      {/* Right: language + menu */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-1.5 font-hotel text-sm font-medium">
          <button
            type="button"
            onClick={() => setLanguage('tr')}
            className={language === 'tr' ? 'text-hotel-text-primary' : 'text-hotel-text-muted'}
          >
            TR
          </button>
          <span className="text-hotel-text-muted">/</span>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={language === 'en' ? 'text-hotel-text-primary' : 'text-hotel-text-muted'}
          >
            EN
          </button>
        </div>
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Menu"
          className="grid h-10 w-10 place-items-center text-hotel-text-primary"
        >
          <Menu size={22} />
        </button>
      </div>
    </header>
  );
}
