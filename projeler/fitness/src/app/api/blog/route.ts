import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(req: NextRequest) {
  await requireAdmin();
  const { searchParams } = req.nextUrl;
  const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
  const limit = 20;
  const published = searchParams.get("published");

  const where = published === "true" ? { isPublished: true } : published === "false" ? { isPublished: false } : {};

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, slug: true, title: true, excerpt: true, coverUrl: true, isPublished: true, publishedAt: true, createdAt: true, tags: true, authorName: true },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return NextResponse.json({ posts, total, page, limit });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();
  const { title, excerpt, content, coverUrl, authorName, tags = [], isPublished = false } = body;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Başlık ve içerik zorunlu" }, { status: 400 });
  }

  const baseSlug = toSlug(title);
  let slug = baseSlug;
  let i = 1;
  while (await prisma.blogPost.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`;
  }

  const post = await prisma.blogPost.create({
    data: {
      slug,
      title: title.trim(),
      excerpt: excerpt?.trim() || null,
      content: content.trim(),
      coverUrl: coverUrl?.trim() || null,
      authorName: authorName?.trim() || null,
      tags,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
