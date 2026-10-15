import type { Metadata } from "next";
import Link from "next/link";
import { AuthFrame } from "@/components/guardian/AuthFrame";
import { getSetting } from "@/lib/settings";
import { ForgotForm } from "./ForgotForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Şifremi unuttum", robots: { index: false, follow: false } };

export default function ForgotPage() {
  return (
    <AuthFrame title="Şifremi unuttum" description="Kayıtlı e-postanıza şifre yenileme bağlantısı gönderelim.">
      <ForgotForm phone={getSetting("contactPhone")} />
      <div className="gs-login-links"><Link href="/giris">Girişe dön</Link></div>
    </AuthFrame>
  );
}
