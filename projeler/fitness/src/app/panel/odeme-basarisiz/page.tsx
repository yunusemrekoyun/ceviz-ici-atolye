import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";

export default async function OdemeBasarisizPage() {
  await requireUser();
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card-surface p-10 text-center max-w-md w-full">
        <div className="w-20 h-20 rounded-2xl bg-rose-500/15 grid place-items-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-rose-400" />
        </div>
        <h1 className="h-display text-2xl mb-3">Ödeme Başarısız</h1>
        <p className="text-body text-sm leading-relaxed mb-8">
          Ödeme işlemi tamamlanamadı. Kart bilgilerini kontrol edip tekrar deneyebilirsin.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/panel/satin-al" className="btn-primary btn-md">
            <RefreshCw className="w-4 h-4" />
            Tekrar Dene
          </Link>
          <Link href="/panel" className="btn-secondary btn-md">
            <ArrowLeft className="w-4 h-4" />
            Panele Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
