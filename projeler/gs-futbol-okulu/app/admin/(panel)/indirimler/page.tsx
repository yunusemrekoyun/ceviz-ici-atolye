import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/server";
import { listDiscounts } from "@/lib/billing";
import { discountedFee, formatMoney } from "@/lib/billing-shared";
import { statusLabel } from "@/lib/registration-status";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "İndirimler" };

/** Uygulanan indirimler, ada göre gruplu. */
export default async function DiscountsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("aidat.gor");
  const all = listDiscounts();
  const raw = (await searchParams).ad;
  const selected = typeof raw === "string" ? all.find((d) => d.name === raw) : undefined;
  const fee = getSettings().feeAmountKurus;
  const list = selected ? [selected] : all;
  return (
    <main className="panel-rise mx-auto w-full max-w-4xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">İndirimler</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">İndirim, okula kayıtta ya da Aidat sayfasındaki öğrenci ayrıntısından uygulanır. Aynı ad yazıldığında öneri olarak çıkar.</p>
      {all.length ? (
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="İndirim adı">
          <Link href="/admin/indirimler" aria-current={!selected ? "page" : undefined} className={["min-h-10 rounded-full border px-3.5 py-2 text-sm font-semibold", !selected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"].join(" ")}>
            Tümü ({all.reduce((n, d) => n + d.students.length, 0)})
          </Link>
          {all.map((d) => (
            <Link key={d.name} href={`/admin/indirimler?ad=${encodeURIComponent(d.name)}`} aria-current={selected?.name === d.name ? "page" : undefined} className={["min-h-10 rounded-full border px-3.5 py-2 text-sm font-semibold", selected?.name === d.name ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"].join(" ")}>
              {d.name} ({d.students.length})
            </Link>
          ))}
        </nav>
      ) : (
        <p className="mt-8 text-center text-muted">Henüz indirim uygulanmadı.</p>
      )}
      <div className="mt-5 grid gap-4">
        {list.map((d) => (
          <section key={d.name} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-ink">
              {d.name} <span className="font-normal text-muted">· {d.percents.map((p) => `%${p}`).join(", ")}</span>
            </h2>
            <ul className="mt-2 divide-y divide-line/70">
              {d.students.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 py-2 text-[15px]">
                  <Link href={`/admin/aidat?ogrenci=${s.id}`} className="min-w-0 flex-1 font-semibold text-ink hover:text-gs-red">
                    {s.name} <span className="font-normal text-muted">{s.studentNo ? `· No ${s.studentNo}` : ""}</span>
                  </Link>
                  <span className="text-sm text-muted">{statusLabel(s.status)}</span>
                  <span className="text-sm font-bold text-ink">
                    %{s.percent}
                    {fee > 0 ? ` · ${formatMoney(discountedFee(fee, s.percent))}/ay` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
