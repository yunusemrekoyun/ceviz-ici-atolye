import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Calendar, ArrowLeft, Tag, User, BookOpen, ArrowRight } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, isPublished: true },
    select: { title: true, excerpt: true, content: true, coverUrl: true, tags: true, authorName: true, publishedAt: true, createdAt: true },
  });

  if (!post) return { title: "Yazı bulunamadı" };

  const description = post.excerpt || post.content.slice(0, 160).replace(/\n+/g, " ");

  return {
    title: post.title,
    description,
    keywords: post.tags,
    authors: post.authorName ? [{ name: post.authorName }] : undefined,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
      authors: post.authorName ? [post.authorName] : undefined,
      images: post.coverUrl ? [{ url: post.coverUrl }] : undefined,
    },
    twitter: {
      card: post.coverUrl ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: post.coverUrl ? [post.coverUrl] : undefined,
    },
  };
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function renderContent(content: string) {
  const paragraphs = content.split(/\n\n+/);
  return paragraphs.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("### ")) {
      return <h3 key={i} className="text-lg font-bold mt-8 mb-3 text-strong">{trimmed.slice(4)}</h3>;
    }
    if (trimmed.startsWith("## ")) {
      return <h2 key={i} className="text-2xl font-bold mt-10 mb-4 h-display">{trimmed.slice(3)}</h2>;
    }
    if (trimmed.startsWith("# ")) {
      return <h2 key={i} className="text-3xl font-bold mt-10 mb-4 h-display">{trimmed.slice(2)}</h2>;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items = trimmed.split("\n").filter((l) => l.startsWith("- ") || l.startsWith("* "));
      return (
        <ul key={i} className="mt-4 mb-4 space-y-2 list-none pl-0">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-dim">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neon shrink-0" />
              {item.slice(2)}
            </li>
          ))}
        </ul>
      );
    }
    if (trimmed.startsWith("> ")) {
      return (
        <blockquote key={i} className="border-l-2 border-neon/50 pl-5 my-6 italic text-body">
          {trimmed.slice(2)}
        </blockquote>
      );
    }
    return (
      <p key={i} className="text-dim leading-relaxed mt-4">
        {trimmed}
      </p>
    );
  });
}

export const dynamic = "force-dynamic";

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const post = await prisma.blogPost.findFirst({
    where: { slug, isPublished: true },
  });

  if (!post) notFound();

  const related = await prisma.blogPost.findMany({
    where: { isPublished: true, NOT: { id: post.id } },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: { id: true, slug: true, title: true, excerpt: true, coverUrl: true, tags: true, publishedAt: true, createdAt: true },
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Cover */}
        <div className="relative pt-16 md:pt-20">
          {post.coverUrl ? (
            <div className="relative h-[320px] md:h-[480px] overflow-hidden">
              <img src={post.coverUrl} alt={post.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-ink-950/30 via-transparent to-ink-950" />
            </div>
          ) : (
            <div className="relative h-[200px] overflow-hidden">
              <div className="absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-neon/10 blur-[120px] pointer-events-none" />
            </div>
          )}
        </div>

        <div className="container-app max-w-4xl pb-24 -mt-16 relative z-10">
          {/* Back */}
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-label hover:text-neon transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Tüm Yazılar
          </Link>

          <article>
            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {post.tags.map((t) => (
                  <span key={t} className="badge badge-neon">
                    <Tag className="w-3 h-3" />{t}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="h-display text-3xl md:text-4xl lg:text-5xl leading-tight">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-muted pb-8 border-b border-white/8">
              {post.authorName && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {post.authorName}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(post.publishedAt ?? post.createdAt)}
              </span>
            </div>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="mt-8 text-lg text-body leading-relaxed border-l-2 border-neon/40 pl-5">
                {post.excerpt}
              </p>
            )}

            {/* Content */}
            <div className="mt-8 text-base">
              {renderContent(post.content)}
            </div>
          </article>

          {/* CTA */}
          <div className="mt-16 card-surface p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neon/5 to-accent-cyan/5 pointer-events-none" />
            <div className="relative">
              <div className="text-neon text-sm font-semibold uppercase tracking-wider mb-2">Hazır mısın?</div>
              <h3 className="h-display text-2xl mb-4">Fitness yolculuğuna başla</h3>
              <p className="text-body text-sm mb-6 max-w-md mx-auto">
                7 gün ücretsiz dene, kredi kartı gerekmez.
              </p>
              <Link href="/kayit" className="btn-primary btn-md">
                Ücretsiz Üye Ol <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="text-lg font-semibold mb-6 text-strong">Diğer Yazılar</h2>
              <div className="grid sm:grid-cols-3 gap-5">
                {related.map((r) => (
                  <Link key={r.id} href={`/blog/${r.slug}`} className="group">
                    <div className="card-surface overflow-hidden hover:border-neon/20 transition-colors">
                      <div className="h-36 overflow-hidden bg-ink-800">
                        {r.coverUrl ? (
                          <img src={r.coverUrl} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full grid place-items-center bg-gradient-to-br from-neon/5 to-accent-cyan/5">
                            <BookOpen className="w-8 h-8 text-neon/15" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-medium line-clamp-2 group-hover:text-neon transition-colors">{r.title}</p>
                        <p className="text-xs text-faint mt-2">{formatDate(r.publishedAt ?? r.createdAt)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
