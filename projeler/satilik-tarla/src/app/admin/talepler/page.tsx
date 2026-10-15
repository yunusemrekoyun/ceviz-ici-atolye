import { Inbox } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { telLink } from '@/lib/format';
import { Card, StatusPill } from '@/components/admin/ui';
import { LeadActions } from '@/components/admin/lead-actions';

const LEAD_TONES: Record<string, { label: string; tone: string }> = {
  yeni: { label: 'Yeni', tone: 'info' },
  okundu: { label: 'Okundu', tone: 'muted' },
  donuldu: { label: 'Dönüldü', tone: 'success' },
};

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function AdminLeadsPage() {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <Card title={`Gelen Talepler (${leads.length})`}>
      {leads.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-sm text-[#4b5b47]">
          <Inbox size={40} className="text-[#85AB8B]" />
          Henüz talep yok.
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const t = LEAD_TONES[lead.status] ?? LEAD_TONES.yeni;
            return (
              <article
                key={lead.id}
                className="rounded-2xl border border-[#D9E3D5] bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label={t.label} tone={t.tone} />
                  <span className="font-medium text-[#1f2a1d]">{lead.name}</span>
                  <a
                    href={telLink(lead.phone)}
                    className="font-medium text-[#3d5638] hover:underline"
                  >
                    {lead.phone}
                  </a>
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="text-[#3d5638] hover:underline">
                      {lead.email}
                    </a>
                  ) : null}
                  <span className="ml-auto text-xs text-[#4b5b47]">
                    {dateFmt.format(lead.createdAt)}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 text-[#4b5b47] sm:grid-cols-3">
                  <span>Bütçe: {lead.budget || '—'}</span>
                  <span>Bölge: {lead.district || '—'}</span>
                  <span>Amaç: {lead.purpose || '—'}</span>
                </div>
                {lead.note ? <p className="mt-2 text-[#4b5b47]">Not: {lead.note}</p> : null}
                <div className="mt-3">
                  <LeadActions leadId={lead.id} status={lead.status} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}
