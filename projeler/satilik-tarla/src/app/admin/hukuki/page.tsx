import { prisma } from '@/lib/prisma';
import { Card } from '@/components/admin/ui';
import { LegalDocEditor } from '@/components/admin/legal-editor';

const DOCS: { key: 'kvkk' | 'gizlilik' | 'cerez' | 'kosullar' | 'iys'; fallbackTitle: string }[] = [
  { key: 'kvkk', fallbackTitle: 'KVKK Aydınlatma Metni' },
  { key: 'gizlilik', fallbackTitle: 'Gizlilik Politikası' },
  { key: 'cerez', fallbackTitle: 'Çerez Politikası' },
  { key: 'kosullar', fallbackTitle: 'Kullanım Koşulları' },
  { key: 'iys', fallbackTitle: 'Ticari Elektronik İleti Onayı' },
];

export default async function AdminLegalPage() {
  const rows = await prisma.legalDoc.findMany();
  const byKey = new Map(rows.map((r) => [r.key as string, r]));

  return (
    <Card title="Hukuki Metinler">
      <p className="mb-4 text-xs text-[#8A6A43]">
        Bu metinler sitede /yasal sayfalarında yayımlanır; kaydettiğiniz anda güncellenir.
      </p>
      <div className="space-y-3">
        {DOCS.map((d) => {
          const row = byKey.get(d.key);
          return (
            <LegalDocEditor
              key={d.key}
              docKey={d.key}
              title={row?.title ?? d.fallbackTitle}
              body={row?.body ?? ''}
              exists={!!row}
            />
          );
        })}
      </div>
    </Card>
  );
}
