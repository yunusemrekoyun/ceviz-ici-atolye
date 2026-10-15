'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  updateBrandHero,
  updateContact,
  updateSections,
  updateStats,
  updateFeatures,
  saveDistricts,
} from '@/app/admin/icerik/actions';
import { ActionForm } from './action-form';
import { AdminInput, AdminTextarea, Field, inputClass, primaryBtn } from './ui';
import { cn } from '@/lib/utils';

export function BrandHeroForm({
  defaults,
}: {
  defaults: {
    brand: string;
    heroBadge: string;
    heroTitleLine1: string;
    heroTitleAccent: string;
    heroSubtitle: string;
  };
}) {
  return (
    <ActionForm action={updateBrandHero}>
      <div className="grid gap-4">
        <Field label="Marka adı">
          <AdminInput name="brand" defaultValue={defaults.brand} required />
        </Field>
        <Field label="Hero üst rozet">
          <AdminInput name="heroBadge" defaultValue={defaults.heroBadge} />
        </Field>
        <Field label="Ana başlık">
          <AdminTextarea name="heroTitleLine1" rows={2} defaultValue={defaults.heroTitleLine1} />
        </Field>
        <Field label="Vurgu satırı (yeşil)">
          <AdminInput name="heroTitleAccent" defaultValue={defaults.heroTitleAccent} />
        </Field>
        <Field label="Alt açıklama">
          <AdminTextarea name="heroSubtitle" rows={3} defaultValue={defaults.heroSubtitle} />
        </Field>
      </div>
    </ActionForm>
  );
}

export function ContactForm({
  defaults,
}: {
  defaults: { contactPhone: string; contactWhatsapp: string; contactEmail: string };
}) {
  return (
    <ActionForm action={updateContact}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Telefon">
          <AdminInput name="contactPhone" defaultValue={defaults.contactPhone} required />
        </Field>
        <Field label="WhatsApp">
          <AdminInput name="contactWhatsapp" defaultValue={defaults.contactWhatsapp} />
        </Field>
        <Field label="E-posta">
          <AdminInput name="contactEmail" defaultValue={defaults.contactEmail} />
        </Field>
      </div>
      <p className="mt-3 text-xs text-[#8A6A43]">
        Telefon/WhatsApp tüm butonlarda otomatik kullanılır (ör. +90 555 123 45 67).
      </p>
    </ActionForm>
  );
}

const SECTION_LABELS: [string, string][] = [
  ['listingsTitle', 'İlanlar — başlık'],
  ['listingsSubtitle', 'İlanlar — açıklama'],
  ['mapTitle', 'Harita — başlık'],
  ['mapSubtitle', 'Harita — açıklama'],
  ['districtsTitle', 'Bölgeler — başlık'],
  ['districtsSubtitle', 'Bölgeler — açıklama'],
  ['aboutTitle', 'Neden Biz — başlık'],
  ['aboutSubtitle', 'Neden Biz — açıklama'],
  ['guideTitle', 'Rehber — başlık'],
  ['guideSubtitle', 'Rehber — açıklama'],
  ['matchTitle', 'Talep Formu — başlık'],
  ['matchSubtitle', 'Talep Formu — açıklama'],
  ['contactTitle', 'İletişim — başlık'],
  ['contactSubtitle', 'İletişim — açıklama'],
];

export function SectionsForm({ sections }: { sections: Record<string, string> }) {
  return (
    <ActionForm action={updateSections}>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTION_LABELS.map(([key, label]) =>
          key in sections ? (
            <Field key={key} label={label}>
              {key.includes('Subtitle') ? (
                <AdminTextarea name={`section:${key}`} rows={2} defaultValue={sections[key]} />
              ) : (
                <AdminInput name={`section:${key}`} defaultValue={sections[key]} />
              )}
            </Field>
          ) : null,
        )}
      </div>
    </ActionForm>
  );
}

export function StatsForm({ stats }: { stats: { id: string; value: string; label: string }[] }) {
  return (
    <ActionForm action={updateStats}>
      <div className="grid gap-3 sm:grid-cols-2">
        {stats.map((s) => (
          <div key={s.id} className="flex gap-2">
            <input type="hidden" name="statId" value={s.id} />
            <input
              name="statValue"
              defaultValue={s.value}
              aria-label="Değer"
              className={cn(inputClass, 'w-24')}
            />
            <input
              name="statLabel"
              defaultValue={s.label}
              aria-label="Etiket"
              className={cn(inputClass, 'flex-1')}
            />
          </div>
        ))}
      </div>
    </ActionForm>
  );
}

export function FeaturesForm({
  features,
}: {
  features: { id: string; title: string; text: string }[];
}) {
  return (
    <ActionForm action={updateFeatures}>
      <div className="space-y-3">
        {features.map((f) => (
          <div key={f.id} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="featureId" value={f.id} />
            <input
              name="featureTitle"
              defaultValue={f.title}
              aria-label="Başlık"
              className={inputClass}
            />
            <input
              name="featureText"
              defaultValue={f.text}
              aria-label="Metin"
              className={inputClass}
            />
          </div>
        ))}
      </div>
    </ActionForm>
  );
}

type DistrictRow = { id?: string; name: string; count: string; text: string };

export function DistrictsEditor({ districts }: { districts: DistrictRow[] }) {
  const [rows, setRows] = useState<DistrictRow[]>(districts);

  function patch(i: number, key: keyof DistrictRow, value: string) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  }

  return (
    <ActionForm action={saveDistricts}>
      <input type="hidden" name="districts" value={JSON.stringify(rows)} />
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id ?? `yeni-${i}`} className="flex gap-2">
            <div className="grid flex-1 gap-2 sm:grid-cols-3">
              <input
                value={r.name}
                onChange={(e) => patch(i, 'name', e.target.value)}
                placeholder="İlçe"
                aria-label="İlçe adı"
                className={inputClass}
              />
              <input
                value={r.count}
                onChange={(e) => patch(i, 'count', e.target.value)}
                placeholder="24 ilan"
                aria-label="İlan sayısı metni"
                className={inputClass}
              />
              <input
                value={r.text}
                onChange={(e) => patch(i, 'text', e.target.value)}
                placeholder="Açıklama"
                aria-label="Açıklama"
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
              aria-label={`${r.name || 'Satırı'} sil`}
              className="grid w-9 shrink-0 place-items-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { name: '', count: '', text: '' }])}
        className={cn(primaryBtn, 'mt-3')}
      >
        <Plus size={15} />
        Bölge Ekle
      </button>
      <p className="mt-3 text-xs text-[#8A6A43]">
        Sıra vitrindeki sırayı belirler. Bölge silmek yayındaki ilanları silmez; yalnızca vitrin
        listesinden kaldırır.
      </p>
    </ActionForm>
  );
}
