import type { Metadata } from "next";
import { redirect } from "next/navigation";
import "@/components/landing/landing.css";
import { safeNextPath } from "@/lib/auth/cookie";
import { getCurrentAdmin } from "@/lib/auth/server";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Giriş" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/giris">) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentAdmin()) redirect(next);

  return (
    <div className="lp-root relative isolate flex min-h-dvh flex-1 flex-col items-center justify-center overflow-hidden px-5 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(169,4,50,0.45),transparent_60%),linear-gradient(180deg,rgba(10,11,13,0.6)_0%,#0a0b0d_85%)]"
      />
      <div className="w-full max-w-[380px]">
        <div className="mb-6 text-center">
          <p className="lp-gold text-[11px] font-semibold uppercase tracking-[0.28em]">Kütahya Galatasaray Futbol Okulları</p>
          <h1 className="lp-display mt-2 text-2xl font-bold text-white">Yönetim Paneli</h1>
        </div>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
