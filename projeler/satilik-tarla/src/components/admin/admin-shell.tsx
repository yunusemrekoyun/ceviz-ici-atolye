'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Leaf, LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Panel' },
  { href: '/admin/ilanlar', label: 'İlanlar' },
  { href: '/admin/icerik', label: 'İçerik' },
  { href: '/admin/rehber', label: 'Rehber' },
  { href: '/admin/hukuki', label: 'Hukuki' },
  { href: '/admin/talepler', label: 'Talepler' },
  { href: '/admin/sikayetler', label: 'Şikayetler' },
  { href: '/admin/uyeler', label: 'Üyeler' },
] as const;

export function AdminShell({
  brand,
  newLeadCount,
  reviewCount,
  complaintCount,
  children,
}: {
  brand: string;
  newLeadCount: number;
  reviewCount: number;
  complaintCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const badgeFor = (href: string) =>
    href === '/admin/talepler'
      ? newLeadCount
      : href === '/admin/sikayetler'
        ? complaintCount
        : href === '/admin'
          ? reviewCount
          : 0;

  return (
    <div className="min-h-screen bg-[#F4EFE6]">
      <header className="sticky top-0 z-20 bg-[#1f2a1d] px-4 py-3 text-[#FAF7EF] sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#3d5638]">
              <Leaf size={16} />
            </span>
            <span className="truncate text-sm font-medium">{brand} · Yönetim</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#FAF7EF]/30 px-3 py-1.5 text-sm transition-colors hover:bg-[#FAF7EF]/10"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Siteye Dön</span>
            </Link>
            <button
              type="button"
              onClick={() =>
                authClient.signOut({ fetchOptions: { onSuccess: () => router.push('/') } })
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-[#FAF7EF]/30 px-3 py-1.5 text-sm transition-colors hover:bg-[#FAF7EF]/10"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      <nav
        className="border-b border-[#D9E3D5] bg-[#FAF7EF] px-4 sm:px-6"
        aria-label="Yönetim menüsü"
      >
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto py-2">
          {NAV.map((item) => {
            const active =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            const badge = badgeFor(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors',
                  active ? 'bg-[#3d5638] text-[#FAF7EF]' : 'text-[#2d3a2a] hover:bg-[#1f2a1d]/5',
                )}
              >
                {item.label}
                {badge > 0 ? (
                  <span className="ml-1.5 inline-grid h-5 min-w-5 place-items-center rounded-full bg-[#8A6A43] px-1 text-[11px] text-[#FAF7EF]">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
