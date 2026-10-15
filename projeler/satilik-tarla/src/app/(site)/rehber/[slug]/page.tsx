import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getGuidePost, getGuidePosts, guideSnippet } from '@/lib/data';
import { isRichHtml } from '@/lib/sanitize';

export const dynamicParams = true;

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export async function generateStaticParams() {
  const posts = await getGuidePosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getGuidePost(slug);
  if (!post) return { title: 'Yazı bulunamadı' };
  return {
    title: post.title,
    description: guideSnippet(post.body, 155),
    alternates: { canonical: `/rehber/${post.slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getGuidePost(slug);
  if (!post) notFound();

  return (
    <article className="container max-w-3xl py-12 lg:py-16">
      <Link
        href="/rehber"
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tüm rehber yazıları
      </Link>

      <p className="mt-6 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-brass-strong">
        <span className="h-0.5 w-8 bg-brass" aria-hidden="true" />
        {post.category}
      </p>
      <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {post.title}
      </h1>
      {post.createdAt ? (
        <p className="nums mt-3 text-[14px] text-muted-foreground">
          {dateFmt.format(new Date(post.createdAt))}
        </p>
      ) : null}

      {isRichHtml(post.body) ? (
        <div
          className="rich-body mt-8 text-[16px] leading-relaxed text-foreground/85"
          // Gövde kaydedilirken sunucuda sanitize edilir (sanitizeRichHtml)
          dangerouslySetInnerHTML={{ __html: post.body }}
        />
      ) : (
        <div className="mt-8 space-y-4 text-[16px] leading-relaxed text-foreground/85">
          {post.body
            .split(/\n{2,}|\n/)
            .filter(Boolean)
            .map((p, i) => (
              <p key={i}>{p}</p>
            ))}
        </div>
      )}
    </article>
  );
}
