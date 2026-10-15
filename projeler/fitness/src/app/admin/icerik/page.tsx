import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { ContentClient } from "@/components/admin/ContentClient";

export default async function ContentPage() {
  await requireAdmin();

  const [posts, testimonials, settings, gallery] = await Promise.all([
    prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, title: true, excerpt: true, coverUrl: true, authorName: true, tags: true, isPublished: true, publishedAt: true, createdAt: true },
    }),
    prisma.testimonial.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
    prisma.siteSetting.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] }),
    prisma.galleryImage.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
  ]);

  return (
    <div>
      <PageHeader
        title="İçerik Yönetimi"
        subtitle="Blog yazıları, yorumlar, galeri ve site metinlerini buradan yönet"
      />
      <ContentClient
        initialPosts={JSON.parse(JSON.stringify(posts))}
        initialTestimonials={JSON.parse(JSON.stringify(testimonials))}
        initialSettings={JSON.parse(JSON.stringify(settings))}
        initialGallery={JSON.parse(JSON.stringify(gallery))}
      />
    </div>
  );
}
