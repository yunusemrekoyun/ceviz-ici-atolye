import { prisma } from '@/lib/prisma';
import { Card, StatusPill } from '@/components/admin/ui';
import { MemberActions } from '@/components/admin/member-actions';

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default async function AdminMembersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      role: true,
      banned: true,
      banReason: true,
      createdAt: true,
      _count: { select: { listings: true, buyerThreads: true } },
    },
  });

  return (
    <Card title={`Üyeler (${users.length})`}>
      <div className="space-y-3">
        {users.map((u) => (
          <article
            key={u.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#D9E3D5] bg-white p-4 text-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-[#1f2a1d]">{u.name}</span>
                <span className="text-[#4b5b47]">{u.email}</span>
                {u.role === 'admin' ? <StatusPill label="Yönetici" tone="success" /> : null}
                {u.banned ? <StatusPill label="Engelli" tone="danger" /> : null}
                {!u.emailVerified ? <StatusPill label="Doğrulanmamış" tone="warning" /> : null}
              </div>
              <p className="mt-1 text-[#4b5b47]">
                {dateFmt.format(u.createdAt)} · {u._count.listings} ilan · {u._count.buyerThreads}{' '}
                görüşme
                {u.banned && u.banReason ? ` · Neden: ${u.banReason}` : ''}
              </p>
            </div>
            <MemberActions userId={u.id} banned={!!u.banned} isAdmin={u.role === 'admin'} />
          </article>
        ))}
      </div>
    </Card>
  );
}
