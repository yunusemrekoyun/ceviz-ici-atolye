import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuthFrame } from "@/components/guardian/AuthFrame";
import { getCurrentUser } from "@/lib/auth/server";
import { PortalLoginForm } from "./PortalLoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Giriş", robots: { index: false, follow: false } };

export default async function PortalLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (user) redirect(user.portal === "coach" ? "/antrenor" : user.portal === "guardian" ? "/veli" : "/admin");
  const { next, sifre } = await searchParams;
  return (
    <AuthFrame title="Veli ve antrenör girişi" description="Öğrenci numaranız veya kullanıcı adınızla giriş yapın.">
        {sifre === "tamam" ? <p className="gs-login-success" role="status">Şifreniz kaydedildi. Şimdi giriş yapabilirsiniz.</p> : null}
        <PortalLoginForm next={typeof next === "string" ? next : ""} />
        <div className="gs-login-links"><Link href="/giris/sifremi-unuttum">Şifremi unuttum</Link><Link href="/"><ArrowLeft size={16} aria-hidden="true" />Ana sayfa</Link></div>
    </AuthFrame>
  );
}
