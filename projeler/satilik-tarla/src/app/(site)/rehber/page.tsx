import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getGuidePosts, guideSnippet } from '@/lib/data';
import { Reveal } from '@/components/motion/reveal';
import { SectionHeading } from '@/components/site/section-heading';

export const metadata: Metadata = {
  title: 'Arazi Rehberi',
  description:
    'Tarla, arsa ve arazi alım-satımı üzerine rehber yazılar: tapu, imar, yatırım ve saha bilgisi.',
  alternates: { canonical: '/rehber' },
};

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default async function Page() {
  const posts = await getGuidePosts();

  return (
    <div className="container py-12 lg:py-16">
      <SectionHeading
        eyebrow="Rehber"
        title="Arazi Rehberi"
        subtitle="Tapu, imar ve yatırım süreçlerinde işinize yarayacak saha bilgisi."
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, i) => (
          <Reveal key={post.slug} delay={(i % 3) * 70} className="h-full">
            <Link
              href={`/rehber/${post.slug}`}
              className="group flex h-full flex-col rounded-lg border border-border bg-card p-6 shadow-soft-sm transition-colors hover:border-primary"
            >
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brass-strong">
                {post.category}
              </span>
              <h2 className="mt-3 font-heading text-xl font-semibold leading-snug text-foreground">
                {post.title}
              </h2>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted-foreground">
                {guideSnippet(post.body)}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-brass-strong">
                Yazıyı Oku
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
              {post.createdAt ? (
                <span className="nums mt-2 text-[12px] text-muted-foreground">
                  {dateFmt.format(new Date(post.createdAt))}
                </span>
              ) : null}
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
