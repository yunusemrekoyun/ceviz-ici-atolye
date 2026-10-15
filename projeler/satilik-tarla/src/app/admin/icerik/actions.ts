'use server';

import { updateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guards';
import { TAGS } from '@/lib/cache-tags';
import { actionError, actionOk, type ActionResult } from '@/lib/action-result';

const str = (formData: FormData, key: string, max = 500) =>
  String(formData.get(key) ?? '')
    .trim()
    .slice(0, max);

export async function updateBrandHero(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const brand = str(formData, 'brand', 80);
  if (!brand) return { ok: false, fieldErrors: { brand: ['Marka adı boş olamaz.'] } };

  await prisma.siteContent.update({
    where: { id: 1 },
    data: {
      brand,
      heroBadge: str(formData, 'heroBadge', 120),
      heroTitleLine1: str(formData, 'heroTitleLine1', 200),
      heroTitleAccent: str(formData, 'heroTitleAccent', 120),
      heroSubtitle: str(formData, 'heroSubtitle', 600),
    },
  });
  updateTag(TAGS.siteContent);
  return actionOk;
}

export async function updateContact(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const phone = str(formData, 'contactPhone', 30);
  if (!phone) return { ok: false, fieldErrors: { contactPhone: ['Telefon boş olamaz.'] } };

  await prisma.siteContent.update({
    where: { id: 1 },
    data: {
      contactPhone: phone,
      contactWhatsapp: str(formData, 'contactWhatsapp', 30),
      contactEmail: str(formData, 'contactEmail', 120),
    },
  });
  updateTag(TAGS.siteContent);
  return actionOk;
}

/** Bölüm başlıkları — sections Json kolonundaki 14 anahtar tek formdan gelir;
 * bilinmeyen anahtarlar korunur (ileride eklenecek bölümler bozulmasın). */
export async function updateSections(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const row = await prisma.siteContent.findUnique({
    where: { id: 1 },
    select: { sections: true },
  });
  if (!row) return actionError('Site içeriği bulunamadı.');

  const sections = { ...(row.sections as Record<string, string>) };
  for (const key of Object.keys(sections)) {
    const v = formData.get(`section:${key}`);
    if (typeof v === 'string') sections[key] = v.trim().slice(0, 600);
  }

  await prisma.siteContent.update({ where: { id: 1 }, data: { sections } });
  updateTag(TAGS.siteContent);
  return actionOk;
}

/** İstatistik şeridi — satırlar paralel dizilerle gelir (statId/statValue/statLabel). */
export async function updateStats(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const ids = formData.getAll('statId').map(String);
  const values = formData.getAll('statValue').map(String);
  const labels = formData.getAll('statLabel').map(String);

  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.stat.update({
        where: { id },
        data: {
          value: values[i]?.trim().slice(0, 40) ?? '',
          label: labels[i]?.trim().slice(0, 80) ?? '',
          position: i,
        },
      }),
    ),
  );
  updateTag(TAGS.siteContent);
  return actionOk;
}

export async function updateFeatures(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const ids = formData.getAll('featureId').map(String);
  const titles = formData.getAll('featureTitle').map(String);
  const texts = formData.getAll('featureText').map(String);

  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.feature.update({
        where: { id },
        data: {
          title: titles[i]?.trim().slice(0, 80) ?? '',
          text: texts[i]?.trim().slice(0, 300) ?? '',
          position: i,
        },
      }),
    ),
  );
  updateTag(TAGS.siteContent);
  return actionOk;
}

/** Bölge listesi — editör tüm listeyi sıralı JSON olarak gönderir; eksilen
 * satır silinir, kalanlar upsert edilir. İlan filtreleri ilçe adına bağlı
 * olduğundan ad değişikliği ilanları etkilemez (ilanda ad kopyası tutulur). */
export async function saveDistricts(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  let rows: { id?: string; name: string; count: string; text: string }[];
  try {
    rows = JSON.parse(String(formData.get('districts') ?? '[]'));
  } catch {
    return actionError('Bölge verisi çözümlenemedi.');
  }
  const clean = rows
    .map((r) => ({
      id: typeof r.id === 'string' && r.id ? r.id : undefined,
      name: String(r.name ?? '')
        .trim()
        .slice(0, 40),
      count: String(r.count ?? '')
        .trim()
        .slice(0, 40),
      text: String(r.text ?? '')
        .trim()
        .slice(0, 200),
    }))
    .filter((r) => r.name);
  if (clean.length === 0) return actionError('En az bir bölge kalmalı.');

  const names = clean.map((r) => r.name);
  if (new Set(names).size !== names.length) {
    return actionError('Bölge adları birbirinden farklı olmalı.');
  }

  await prisma.$transaction(async (tx) => {
    const keepIds = clean.map((r) => r.id).filter(Boolean) as string[];
    await tx.district.deleteMany({ where: { id: { notIn: keepIds } } });
    for (const [i, r] of clean.entries()) {
      if (r.id) {
        await tx.district.update({
          where: { id: r.id },
          data: { name: r.name, count: r.count, text: r.text, position: i },
        });
      } else {
        await tx.district.create({
          data: { name: r.name, count: r.count, text: r.text, position: i },
        });
      }
    }
  });
  updateTag(TAGS.siteContent);
  return actionOk;
}
