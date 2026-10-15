'use client';

import { useState } from 'react';
import { DoorOpen, BedDouble, LayoutGrid, List, Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { RoomManager } from '@/components/admin/RoomManager';
import { RoomTypeManager } from '@/components/admin/RoomTypeManager';
import { CleaningManager } from '@/components/admin/CleaningManager';

type SubTab  = 'rooms' | 'types' | 'cleaning';
type ViewMode = 'card' | 'list';

export function OdalarSection() {
  const { language } = useLanguage();
  const tr = language === 'tr';

  const [activeTab, setActiveTab] = useState<SubTab>('rooms');
  const [viewMode,  setViewMode]  = useState<ViewMode>('card');

  const tabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
    { id: 'rooms',    label: tr ? 'Odalar'         : 'Rooms',      icon: DoorOpen  },
    { id: 'types',    label: tr ? 'Oda Çeşitleri'  : 'Room Types', icon: BedDouble },
    { id: 'cleaning', label: tr ? 'Temizlik'        : 'Cleaning',   icon: Sparkles  },
  ];

  return (
    <div className="space-y-5">

      {/* ── Controls row ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">

        {/* Sub-tab bar */}
        <div className="tab-list w-fit">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/20'
                    : 'text-muted hover:text-main border border-transparent hover:bg-m-hover'}
                `}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>

        {/* View mode toggle — only for rooms/types tabs */}
        <div className={`tab-list ${activeTab === 'cleaning' ? 'invisible' : ''}`}>
          {([
            { id: 'card' as ViewMode, Icon: LayoutGrid, title: tr ? 'Kart Görünümü' : 'Card View'  },
            { id: 'list' as ViewMode, Icon: List,        title: tr ? 'Liste Görünümü' : 'List View' },
          ]).map(({ id, Icon, title }) => {
            const isActive = viewMode === id;
            return (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                title={title}
                className={`
                  flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/20'
                    : 'text-subtle hover:text-main border border-transparent hover:bg-m-hover'}
                `}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>

      </div>

      {/* ── Content ── */}
      {activeTab === 'cleaning'
        ? <CleaningManager tr={tr} />
        : activeTab === 'rooms'
          ? <RoomManager     viewMode={viewMode} />
          : <RoomTypeManager viewMode={viewMode} />
      }

    </div>
  );
}
