'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MobileHeader } from './MobileHeader';
import { MobileBottomTab, type MobileTab } from './MobileBottomTab';
import { MobileMenu } from './MobileMenu';
import { MobileHome } from './screens/MobileHome';
import { MobileRooms } from './screens/MobileRooms';
import { MobileRoomDetail } from './screens/MobileRoomDetail';
import { MobileBooking } from './screens/MobileBooking';
import { MobileServices } from './screens/MobileServices';
import { MobileReviews } from './screens/MobileReviews';
import { MobileContact } from './screens/MobileContact';
import { MobileProfile } from './screens/MobileProfile';
import type { RoomData } from './types';

// In-page mobile shell (md:hidden). Client-side screen state + persistent header,
// bottom tab and slide-over menu; animated screen transitions. Desktop keeps the
// existing App.tsx (rendered hidden md:block in app/page.tsx).
type Screen = 'home' | 'rooms' | 'room-detail' | 'booking' | 'services' | 'reviews' | 'contact' | 'profile';

export function MobileApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomOrigin, setRoomOrigin] = useState<Screen>('rooms');
  const [menuOpen, setMenuOpen] = useState(false);

  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/rooms')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setRooms(d.rooms as RoomData[]);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const tabFor = (s: Screen): MobileTab =>
    s === 'rooms' || s === 'room-detail' || s === 'booking'
      ? 'rooms'
      : s === 'services' || s === 'reviews' || s === 'contact'
        ? 'services'
        : s === 'profile'
          ? 'profile'
          : 'home';

  const onTab = (t: MobileTab) =>
    setScreen(t === 'home' ? 'home' : t === 'rooms' ? 'rooms' : t === 'services' ? 'services' : 'profile');

  const selectRoom = (id: string) => {
    setRoomOrigin(screen === 'rooms' ? 'rooms' : 'home');
    setSelectedRoomId(id);
    setScreen('room-detail');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return (
          <MobileHome
            rooms={rooms}
            loading={loading}
            onBook={() => setScreen('booking')}
            onRooms={() => setScreen('rooms')}
            onSelectRoom={selectRoom}
          />
        );
      case 'rooms':
        return (
          <MobileRooms rooms={rooms} loading={loading} onBack={() => setScreen('home')} onSelectRoom={selectRoom} />
        );
      case 'room-detail':
        return (
          <MobileRoomDetail
            room={rooms.find((r) => r.id === selectedRoomId) ?? null}
            onBack={() => setScreen(roomOrigin)}
            onBook={() => setScreen('booking')}
          />
        );
      case 'booking':
        return (
          <MobileBooking
            rooms={rooms}
            initialRoomTypeId={rooms.find((r) => r.id === selectedRoomId)?.roomTypeId ?? null}
            onExit={() => setScreen('home')}
          />
        );
      case 'services':
        return (
          <MobileServices
            rooms={rooms}
            onReviews={() => setScreen('reviews')}
            onContact={() => setScreen('contact')}
          />
        );
      case 'reviews':
        return <MobileReviews onBack={() => setScreen('services')} />;
      case 'contact':
        return <MobileContact onBack={() => setScreen('services')} />;
      case 'profile':
        return <MobileProfile />;
    }
  };

  return (
    <div
      className="hotel-grain relative flex min-h-dvh flex-col font-hotel text-hotel-text-primary"
      style={{
        background:
          'radial-gradient(115% 45% at 50% 0%, rgba(244,181,132,0.13), transparent 55%),' +
          'radial-gradient(90% 50% at 50% 100%, rgba(232,165,116,0.06), transparent 65%),' +
          'linear-gradient(180deg, #241c14 0%, #1d1610 52%, #1a1612 100%)',
      }}
    >
      <MobileHeader onLogoClick={() => setScreen('home')} onMenuClick={() => setMenuOpen(true)} />

      <main className="flex-1 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      <MobileBottomTab active={tabFor(screen)} onTabChange={onTab} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={(s) => setScreen(s as Screen)} />
    </div>
  );
}
