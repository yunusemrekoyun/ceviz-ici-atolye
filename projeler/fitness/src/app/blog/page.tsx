import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Calendar, Tag, ArrowRight, BookOpen } from "lucide-react";

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export const metadata: Metadata = {
  title: "Blog",
  description: "Fitness, beslenme ve antrenman üzerine BahaFitness'tan güncel yazılar.",
  alternates: { canonical: "/blog" },
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverUrl: true,
      authorName: true,
      tags: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  const featuredPost = posts[0] ?? null;
  const restPosts = posts.slice(1);

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="relative pt-32 md:pt-40 pb-16 overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-neon/10 blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-accent-violet/10 blur-[100px] pointer-events-none" />

          <div className="container-app relative text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-strong mb-6">
              <BookOpen className="w-3.5 h-3.5 text-neon" />
              Fitness & Sağlık İçerikleri
            </div>
            <h1 className="h-display text-5xl md:text-6xl">
              <span className="text-gradient-neon">Blog</span>
            </h1>
            <p className="mt-4 text-body text-lg max-w-xl mx-auto">
              Antrenman taktikleri, beslenme rehberleri ve fitness dünyasından güncel içerikler.
            </p>
          </div>
        </section>

        <div className="container-app pb-24">
          {posts.length === 0 ? (
            <div className="card-surface p-16 text-center">
              <BookOpen className="w-12 h-12 text-neon/30 mx-auto" />
              <div className="mt-4 text-lg font-semibold text-body">Henüz içerik yok</div>
              <p className="mt-2 text-sm text-faint">Yakında harika yazılar burada olacak.</p>
            </div>
          ) : (
            <>
              {/* Featured post */}
              {featuredPost && (
                <Link href={`/blog/${featuredPost.slug}`} className="group block mb-10">
                  <div className="card-surface overflow-hidden grid md:grid-cols-2 gap-0 hover:border-neon/20 transition-colors">
                    <div className="relative h-64 md:h-auto overflow-hidden bg-ink-800">
                      {featuredPost.coverUrl ? (
                        <img
                          src={featuredPost.coverUrl}
                          alt={featuredPost.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center bg-gradient-to-br from-neon/10 to-accent-cyan/5">
                          <BookOpen className="w-16 h-16 text-neon/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 md:block hidden" style={{ background: "linear-gradient(to right, transparent, var(--bg-card))" }} />
                    </div>
                    <div className="p-8 md:p-10 flex flex-col justify-center">
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="badge badge-neon">Öne Çıkan</span>
                        {featuredPost.tags.slice(0, 2).map((t) => (
                          <span key={t} className="badge badge-neutral">{t}</span>
                        ))}
                      </div>
                      <h2 className="h-display text-2xl md:text-3xl group-hover:text-neon transition-colors line-clamp-3">
                        {featuredPost.title}
                      </h2>
                      {featuredPost.excerpt && (
                        <p className="mt-3 text-body text-sm leading-relaxed line-clamp-3">
                          {featuredPost.excerpt}
                        </p>
                      )}
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted">
                          {featuredPost.authorName && <span>{featuredPost.authorName}</span>}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(featuredPost.publishedAt ?? featuredPost.createdAt)}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 text-neon text-sm font-medium group-hover:gap-2 transition-all">
                          Oku <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Rest of posts grid */}
              {restPosts.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {restPosts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                      <article className="card-surface overflow-hidden h-full flex flex-col hover:border-neon/20 transition-colors">
                        <div className="h-48 overflow-hidden bg-ink-800 shrink-0">
                          {post.coverUrl ? (
                            <img
                              src={post.coverUrl}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full grid place-items-center bg-gradient-to-br from-neon/5 to-accent-cyan/5">
                              <BookOpen className="w-10 h-10 text-neon/15" />
                            </div>
                          )}
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {post.tags.slice(0, 3).map((t) => (
                                <span key={t} className="badge badge-neutral">{t}</span>
                              ))}
                            </div>
                          )}
                          <h3 className="font-semibold text-base leading-snug group-hover:text-neon transition-colors line-clamp-2 flex-1">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="mt-2 text-xs text-label leading-relaxed line-clamp-2">
                              {post.excerpt}
                            </p>
                          )}
                          <div className="mt-4 flex items-center gap-3 text-xs text-faint pt-4 border-t border-subtle">
                            {post.authorName && <span>{post.authorName}</span>}
                            <span className="flex items-center gap-1 ml-auto">
                              <Calendar className="w-3 h-3" />
                              {formatDate(post.publishedAt ?? post.createdAt)}
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
