import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, trainers] = await Promise.all([
    prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true, publishedAt: true, createdAt: true },
    }),
    prisma.trainer.findMany({
      where: { isActive: true },
      select: { id: true, createdAt: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    "", "/blog", "/kayit", "/giris", "/hakkimizda", "/kvkk", "/gizlilik", "/kullanim-sartlari",
  ].map((path) => ({
    url: `${APP_URL}${path}`,
    lastModified: new Date(),
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${APP_URL}/blog/${p.slug}`,
    lastModified: p.publishedAt ?? p.createdAt,
  }));

  const trainerRoutes: MetadataRoute.Sitemap = trainers.map((t) => ({
    url: `${APP_URL}/egitmenler/${t.id}`,
    lastModified: t.createdAt,
  }));

  return [...staticRoutes, ...postRoutes, ...trainerRoutes];
}
