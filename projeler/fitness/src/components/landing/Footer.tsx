import Link from "next/link";
import { Dumbbell, Instagram, Youtube, Facebook, MapPin, Phone, Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getContactSettings() {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: ["contact.phone", "contact.email", "contact.address", "social.instagram", "social.facebook", "social.youtube"] } },
      select: { key: true, value: true },
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return {};
  }
}

export async function Footer() {
  const s = await getContactSettings();

  const socials: { Icon: React.ElementType; href: string | undefined }[] = [
    { Icon: Instagram, href: s["social.instagram"] },
    { Icon: Youtube, href: s["social.youtube"] },
    { Icon: Facebook, href: s["social.facebook"] },
  ];

  return (
    <footer className="border-t border-subtle mt-10">
      <div className="container-app py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-neon grid place-items-center shadow-glow">
              <Dumbbell className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-lg">Baha<span className="text-neon">Fitness</span></span>
          </Link>
          <p className="mt-4 text-sm text-body leading-relaxed">
            Premium fitness deneyimi. Modern ekipmanlar, uzman antrenörler, akıllı analitik.
          </p>
          <div className="mt-5 flex gap-2">
            {socials.map(({ Icon, href }, i) =>
              href ? (
                <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="w-9 h-9 grid place-items-center rounded-lg bg-subtle text-muted hover:text-white hover:bg-subtle-md transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ) : (
                <span key={i} className="w-9 h-9 grid place-items-center rounded-lg bg-subtle text-muted cursor-default">
                  <Icon className="w-4 h-4" />
                </span>
              )
            )}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-4">Hızlı Linkler</div>
          <ul className="space-y-2.5 text-sm text-body">
            <li><a className="hover:text-white" href="/#planlar">Üyelikler</a></li>
            <li><a className="hover:text-white" href="/#egitmenler">Eğitmenler</a></li>
            <li><a className="hover:text-white" href="/#bmi">BMI Hesaplama</a></li>
            <li><Link className="hover:text-white" href="/blog">Blog</Link></li>
            <li><Link className="hover:text-white" href="/giris">Üye Girişi</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold mb-4">Kurumsal</div>
          <ul className="space-y-2.5 text-sm text-body">
            <li><Link className="hover:text-white" href="/hakkimizda">Hakkımızda</Link></li>
            <li><Link className="hover:text-white" href="/kvkk">KVKK</Link></li>
            <li><Link className="hover:text-white" href="/gizlilik">Gizlilik Politikası</Link></li>
            <li><Link className="hover:text-white" href="/kullanim-sartlari">Kullanım Şartları</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold mb-4">İletişim</div>
          <ul className="space-y-3 text-sm text-body">
            {s["contact.address"] && (
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-neon shrink-0" />
                {s["contact.address"]}
              </li>
            )}
            {s["contact.phone"] && (
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-neon" />
                <a href={`tel:${s["contact.phone"]}`} className="hover:text-white">
                  {s["contact.phone"]}
                </a>
              </li>
            )}
            {s["contact.email"] && (
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-neon" />
                <a href={`mailto:${s["contact.email"]}`} className="hover:text-white">
                  {s["contact.email"]}
                </a>
              </li>
            )}
            {!s["contact.address"] && !s["contact.phone"] && !s["contact.email"] && (
              <li><a className="hover:text-white" href="/#iletisim">Bize ulaş →</a></li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-subtle">
        <div className="container-app py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <div>© {new Date().getFullYear()} Baha Fitness. Tüm hakları saklıdır.</div>
          <div>Made with <span className="text-neon">♥</span> in İstanbul</div>
        </div>
      </div>
    </footer>
  );
}
