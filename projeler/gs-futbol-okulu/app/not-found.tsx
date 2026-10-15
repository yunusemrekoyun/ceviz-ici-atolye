import Link from "next/link";
import { PUBLIC_FORM_PATH } from "@/lib/constants";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-6xl font-bold text-gs-red">404</p>
      <h1 className="mt-4 text-xl font-semibold">Sayfa bulunamadı</h1>
      <p className="mt-2 text-muted">Aradığınız sayfa mevcut değil.</p>
      <Link
        href={PUBLIC_FORM_PATH}
        className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-gs-red px-6 font-semibold text-white"
      >
        Ön kayıt formuna git
      </Link>
    </main>
  );
}
