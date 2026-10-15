'use client';

import { motion } from 'motion/react';
import { Home, BedDouble, ConciergeBell, User } from 'lucide-react';
import type { ElementType } from 'react';

// Persistent bottom tab bar (design-refs/refs.pdf): Home · Rooms · Services · Profile.
// Active tab = peach. Services is the Reviews + Contact hub (per agreed routing).
export type MobileTab = 'home' | 'rooms' | 'services' | 'profile';

const TABS: { id: MobileTab; icon: ElementType }[] = [
  { id: 'home', icon: Home },
  { id: 'rooms', icon: BedDouble },
  { id: 'services', icon: ConciergeBell },
  { id: 'profile', icon: User },
];

export function MobileBottomTab({
  active,
  onTabChange,
}: {
  active: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-hotel-border-muted bg-hotel-bg bottom-bar-pad">
      {TABS.map(({ id, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            aria-label={id}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex flex-1 items-center justify-center transition-colors ${
              isActive ? 'text-hotel-peach' : 'text-hotel-text-muted'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="tab-indicator"
                className="absolute top-0 h-0.5 w-9 rounded-full bg-hotel-peach"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <Icon size={24} strokeWidth={isActive ? 2.2 : 1.8} />
          </button>
        );
      })}
    </nav>
  );
}
