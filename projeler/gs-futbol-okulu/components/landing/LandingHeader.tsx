"use client";

import Link from "next/link";
import { BRAND, NAV_ITEMS, REGISTER_PATH } from "./content";

type Props = {
  active: number;
  onNavigate: (index: number) => void;
};

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7M17 7H7M17 7V17" />
    </svg>
  );
}

export function LandingHeader({ active, onNavigate }: Props) {
  return (
    <header className="absolute inset-x-0 top-0 z-30 px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between sm:contents">
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate(0);
            }}
            className="lp-display text-lg font-bold uppercase tracking-[0.28em] text-white drop-shadow-sm sm:order-2 sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:text-xl"
          >
            {BRAND.wordmark}
          </Link>

          <Link
            href={REGISTER_PATH}
            className="lp-glass-nav inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold tracking-wider text-white transition hover:border-white/25 hover:bg-white/15 sm:order-3"
          >
            <span>Ön Kayıt</span>
            <ArrowIcon className="h-3 w-3" />
          </Link>
        </div>

        <nav aria-label="Bölümler" className="sm:order-1">
          <div className="lp-glass-nav flex w-max max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV_ITEMS.map((item, i) => {
              const isActive = i === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(i)}
                  aria-current={isActive ? "true" : undefined}
                  className={[
                    "lp-nav-btn whitespace-nowrap rounded-full px-3 py-2 font-medium tracking-wide transition-colors duration-200 sm:px-4",
                    isActive ? "bg-white/15 text-white" : "text-zinc-300 hover:text-white",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}
