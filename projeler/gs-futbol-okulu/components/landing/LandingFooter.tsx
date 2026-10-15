import Link from "next/link";
import { BRAND, CONTACT, REGISTER_PATH } from "./content";

export function LandingFooter() {
  const year = new Date().getFullYear();
  const contactItems = [
    CONTACT.phone ? { label: "Telefon", value: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/\s/g, "")}` } : null,
    CONTACT.email ? { label: "E-posta", value: CONTACT.email, href: `mailto:${CONTACT.email}` } : null,
    CONTACT.instagram
      ? { label: "Instagram", value: `@${CONTACT.instagram.replace(/^@/, "")}`, href: `https://instagram.com/${CONTACT.instagram.replace(/^@/, "")}` }
      : null,
    CONTACT.address ? { label: "Adres", value: CONTACT.address, href: null } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <footer className="px-4 pb-8 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[28px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="lp-display text-lg font-bold uppercase tracking-[0.28em] text-white">{BRAND.wordmark}</p>
            <p className="mt-1 text-sm text-zinc-400">{BRAND.fullName}</p>
          </div>
          <div className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {contactItems.map((item) => (
              <div key={item.label}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{item.label}</p>
                {item.href ? (
                  <a href={item.href} className="text-sm text-zinc-200 hover:text-white" target={item.href.startsWith("http") ? "_blank" : undefined} rel="noopener">
                    {item.value}
                  </a>
                ) : (
                  <p className="text-sm text-zinc-200">{item.value}</p>
                )}
              </div>
            ))}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Kayıt</p>
              <Link href={REGISTER_PATH} className="text-sm text-zinc-200 hover:text-white">
                Ön kayıt formu
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-8 border-t border-white/10 pt-4 text-xs text-zinc-500">
          © {year} {BRAND.fullName}
        </p>
      </div>
    </footer>
  );
}
