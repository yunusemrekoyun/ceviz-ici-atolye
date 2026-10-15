import Link from "next/link";
import { CheckCircle2, ArrowRight, Home } from "lucide-react";
import { requireUser } from "@/lib/auth";

export default async function OdemeBasariliPage() {
  await requireUser();
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card-surface p-10 text-center max-w-md w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neon/5 to-emerald-500/5 pointer-events-none" />
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-neon/15 grid place-items-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-neon" />
          </div>
          <h1 className="h-display text-2xl mb-3">Ödeme Başarılı!</h1>
          <p className="text-body text-sm leading-relaxed mb-8">
            Üyeliğin aktif edildi. Spor salonuna giriş yapabilir, tüm özellikleri kullanabilirsin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/panel" className="btn-primary btn-md">
              <Home className="w-4 h-4" />
              Panele Git
            </Link>
            <Link href="/panel/odemeler" className="btn-secondary btn-md">
              Ödeme Geçmişi <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
