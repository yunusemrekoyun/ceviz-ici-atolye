'use server';

import { updateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guards';
import { TAGS } from '@/lib/cache-tags';
import { slugify } from '@/lib/slugify';
import { actionError, actionOk, type ActionResult } from '@/lib/action-result';
import { sanitizeRichHtml } from '@/lib/sanitize';

/** Rehber yazısı kaydı — id null ise yeni yazı. Slug başlıktan üretilir,
 * çakışırsa kısa ek alır; mevcut yazının slug'ı değişmez (SEO). */
export async function saveBlogPost(
  postId: string | null,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const title = String(formData.get('title') ?? '')
    .trim()
    .slice(0, 160);
  const category = String(formData.get('category') ?? '')
    .trim()
    .slice(0, 60);
  const body = sanitizeRichHtml(String(formData.get('body') ?? '').slice(0, 100_000)).trim();
  const status = formData.get('status') === 'yayinda' ? 'yayinda' : 'taslak';

  const fieldErrors: Record<string, string[]> = {};
  if (title.length < 3) fieldErrors.title = ['Başlık en az 3 karakter.'];
  if (!category) fieldErrors.category = ['Kategori girin.'];
  if (body.length < 20) fieldErrors.body = ['Metin en az 20 karakter.'];
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  if (postId) {
    const updated = await prisma.blogPost.updateMany({
      where: { id: postId },
      data: { title, category, body, status },
    });
    if (updated.count === 0) return actionError('Yazı bulunamadı.');
  } else {
    let slug = slugify(title);
    const clash = await prisma.blogPost.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 7)}`;
    await prisma.blogPost.create({
      data: { title, category, body, status, slug, source: 'manuel' },
    });
  }

  updateTag(TAGS.articles);
  return actionOk;
}

export async function deleteBlogPost(postId: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.blogPost.deleteMany({ where: { id: postId } });
  updateTag(TAGS.articles);
  return actionOk;
}
