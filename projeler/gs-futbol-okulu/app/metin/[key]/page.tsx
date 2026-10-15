import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { BRAND_NAME } from "@/lib/constants";
import { formatDateTr } from "@/lib/format";
import { getPublishedText } from "@/lib/legal";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ key: string }> };

function load(key: string) {
  return /^[a-z0-9-]{1,60}$/.test(key) ? getPublishedText(key) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = load((await params).key);
  return { title: found ? found.text.title : "Metin bulunamadı" };
}

export default async function LegalTextPage({ params }: Props) {
  const found = load((await params).key);
  if (!found) notFound();
  const { text, version } = found;
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
      <Link href="/" className="text-sm font-semibold text-gs-red hover:underline">
        ← {BRAND_NAME}
      </Link>
      <article className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-ink">{text.title}</h1>
        <p className="mt-1 text-sm text-muted">
          Sürüm {version.version}
          {version.publishedAt ? ` · ${formatDateTr(version.publishedAt.slice(0, 10))}` : ""}
        </p>
        <Markdown source={version.body} className="mt-6 text-[16px] text-ink" />
      </article>
    </main>
  );
}
