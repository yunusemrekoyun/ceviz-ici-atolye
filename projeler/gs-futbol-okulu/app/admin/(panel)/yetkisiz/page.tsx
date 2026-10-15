import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Yetkiniz yok" };

export default function NoPermissionPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gs-red-soft text-gs-red" aria-hidden="true">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
      <h1 className="mt-4 text-xl font-bold text-ink">Bu sayfa için yetkiniz yok</h1>
      <p className="mt-2 text-muted">Erişim gerekiyorsa yöneticiden rolünüze bu izni eklemesini isteyin.</p>
      <Link href="/admin" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-gs-red px-6 font-semibold text-white transition hover:bg-gs-red-dark">
        Ana sayfaya dön
      </Link>
    </main>
  );
}
