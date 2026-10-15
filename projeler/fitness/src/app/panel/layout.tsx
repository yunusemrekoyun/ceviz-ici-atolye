import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPanelAccess, PANEL_OPEN_PATHS } from "@/lib/membership";
import { Dumbbell, Home, Activity, CreditCard, User as UserIcon, ShoppingCart, Calendar, Clock, MessageCircle, Apple } from "lucide-react";
import { LogoutBtn } from "./LogoutBtn";
import { PanelMobileNav } from "./PanelMobileNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VerifyEmailBanner } from "@/components/panel/VerifyEmailBanner";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pathname = (await headers()).get("x-pathname") ?? "";

  const isOpenPath = PANEL_OPEN_PATHS.some((p) => pathname.startsWith(p));

  let gated = false;
  let trialEnd: Date | undefined;

  if (!isOpenPath) {
    const access = await checkPanelAccess(user.sub);
    if (!access.ok) {
      gated = true;
      trialEnd = access.trialEnd;
    }
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.sub }, select: { emailVerified: true } });

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-subtle bg-navbar backdrop-blur-xl">
        <div className="container-app h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-neon grid place-items-center shadow-glow">
              <Dumbbell className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold">Baha<span className="text-neon">Fitness</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/panel" className="px-4 py-2 text-sm text-dim hover:text-white rounded-lg hover:bg-subtle"><Home className="w-4 h-4 inline mr-1" />Ana Sayfa</Link>
            <Link href="/panel/antrenman" className="px-4 py-2 text-sm text-dim hover:text-white rounded-lg hover:bg-subtle"><Activity className="w-4 h-4 inline mr-1" />Antrenman</Link>
            <Link href="/panel/beslenme" className="px-4 py-2 text-sm text-dim hover:text-white rounded-lg hover:bg-subtle"><Apple className="w-4 h-4 inline mr-1" />Beslenme</Link>
            <Link href="/panel/dersler" className="px-4 py-2 text-sm text-dim hover:text-white rounded-lg hover:bg-subtle"><Calendar className="w-4 h-4 inline mr-1" />Dersler</Link>
            <Link href="/panel/mesajlar" className="px-4 py-2 text-sm text-dim hover:text-white rounded-lg hover:bg-subtle"><MessageCircle className="w-4 h-4 inline mr-1" />Mesajlar</Link>
            <Link href="/panel/profil" className="px-4 py-2 text-sm text-dim hover:text-white rounded-lg hover:bg-subtle"><UserIcon className="w-4 h-4 inline mr-1" />Profil</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/panel/uyeligim" className="btn-primary btn-sm hidden sm:inline-flex">
              <CreditCard className="w-3.5 h-3.5" />
              Üyeliğim
            </Link>
            <LogoutBtn />
          </div>
        </div>
      </header>

      <main className="container-app py-8">
        {!dbUser?.emailVerified && <VerifyEmailBanner />}
        {gated ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="w-20 h-20 rounded-2xl bg-neon/10 border border-neon/20 grid place-items-center mb-6">
              <Clock className="w-10 h-10 text-neon" />
            </div>
            <h1 className="text-3xl font-bold mb-3">
              {trialEnd ? "Deneme süren sona erdi" : "Aktif üyelik gerekli"}
            </h1>
            <p className="text-body max-w-md mb-2">
              {trialEnd
                ? `7 günlük ücretsiz deneme süren ${trialEnd.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} tarihinde sona erdi.`
                : "Bu alana erişmek için aktif bir üyelik gerekiyor."}
            </p>
            <p className="text-muted text-sm max-w-sm mb-8">
              Online ödeme yapabilir ya da salona gelip fiziksel ödeme yapabilirsin — her iki durumda da üyeliğin aktif edilecektir.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/panel/satin-al" className="btn-primary btn-lg">
                <ShoppingCart className="w-4 h-4" />
                Üyelik Satın Al
              </Link>
              <Link href="/panel/profil" className="btn-secondary btn-lg">
                Profil & Ayarlar
              </Link>
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      <PanelMobileNav />
    </div>
  );
}
