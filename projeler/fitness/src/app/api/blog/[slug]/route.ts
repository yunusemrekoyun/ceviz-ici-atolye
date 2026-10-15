import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const body = await req.json();

  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const { title, excerpt, content, coverUrl, authorName, tags, isPublished } = body;

  const wasUnpublished = !post.isPublished;
  const nowPublishing = isPublished === true && wasUnpublished;

  const updated = await prisma.blogPost.update({
    where: { slug },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(excerpt !== undefined ? { excerpt: excerpt?.trim() || null } : {}),
      ...(content !== undefined ? { content: content.trim() } : {}),
      ...(coverUrl !== undefined ? { coverUrl: coverUrl?.trim() || null } : {}),
      ...(authorName !== undefined ? { authorName: authorName?.trim() || null } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(isPublished !== undefined ? {
        isPublished,
        publishedAt: nowPublishing ? new Date() : (isPublished ? post.publishedAt : null),
      } : {}),
    },
  });

  return NextResponse.json({ post: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  await prisma.blogPost.delete({ where: { slug } });
  return NextResponse.json({ ok: true });
}
