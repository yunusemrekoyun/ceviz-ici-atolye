import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/get-session';
import { prisma } from '@/lib/prisma';
import { AdminShell } from '@/components/admin/admin-shell';

function UnauthorizedScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#1f2a1d] px-4">
      <div className="w-full max-w-sm rounded-[2rem] bg-[#FAF7EF] p-8 text-center shadow-2xl">
        <h1 className="text-lg font-semibold text-[#1f2a1d]">Yetkisiz Erişim</h1>
        <p className="mt-3 text-sm text-[#4b5b47]">
          Bu sayfayı görüntülemek için yönetici yetkisi gerekiyor.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#3d5638] px-4 py-3 text-[#FAF7EF] transition-colors hover:bg-[#2d4228]"
        >
          Siteye Dön
        </Link>
      </div>
    </div>
  );
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (!session) {
    redirect('/giris?callbackURL=/admin');
  }

  if (session.user.role !== 'admin' || session.user.banned) {
    return <UnauthorizedScreen />;
  }

  const [brandRow, newLeadCount, reviewCount, priceRequestCount, complaintCount] =
    await Promise.all([
      prisma.siteContent.findUnique({ where: { id: 1 }, select: { brand: true } }),
      prisma.lead.count({ where: { status: 'yeni' } }),
      prisma.listing.count({ where: { status: 'incelemede' } }),
      prisma.listingPriceRequest.count({ where: { status: 'bekliyor' } }),
      prisma.complaint.count({ where: { status: 'acik' } }),
    ]);

  return (
    <AdminShell
      brand={brandRow?.brand ?? 'Kütahya Satılık Tarla'}
      newLeadCount={newLeadCount}
      reviewCount={reviewCount + priceRequestCount}
      complaintCount={complaintCount}
    >
      {children}
    </AdminShell>
  );
}
