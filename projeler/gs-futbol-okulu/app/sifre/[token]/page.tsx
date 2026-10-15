import type { Metadata } from "next";
import Link from "next/link";
import { AuthFrame } from "@/components/guardian/AuthFrame";
import { peekAuthToken } from "@/lib/guardians";
import { SetPasswordForm } from "./SetPasswordForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Şifre belirle", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = peekAuthToken(token);
  return (
    <AuthFrame title={found?.user.passwordHash ? "Yeni şifre" : "Şifrenizi belirleyin"}>
        {found ? (
          <>
            <p className="mb-6 text-[#625c62]">Merhaba {found.user.fullName ?? ""}. Kolay hatırlayacağınız ama başkasının tahmin edemeyeceği bir şifre seçin.</p>
            <SetPasswordForm token={token} min={found.user.role === "guardian" ? 8 : 10} />
          </>
        ) : (
          <div>
            <p>Bu bağlantının süresi dolmuş ya da daha önce kullanılmış.</p>
            <p className="mt-2 gs-login-security">Okulu arayarak yeni bağlantı isteyebilirsiniz.</p>
            <Link href="/giris" className="gs-login-links">
              Girişe dön
            </Link>
          </div>
        )}
    </AuthFrame>
  );
}
