import type { Metadata } from "next";
import { can, requireAdmin } from "@/lib/auth/server";
import { listAgeGroups } from "@/lib/age-groups-db";
import { todayKey } from "@/lib/billing";
import { listDrills, listTests } from "@/lib/development";
import { groupScope } from "@/lib/scan";
import { DevelopmentEntry } from "@/components/staff/DevelopmentEntry";
import { DevelopmentSettings } from "./DevelopmentSettings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gelişim" };

export default async function DevelopmentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireAdmin("gelisim.gir");
  const tab = (await searchParams).sekme;
  const scope = groupScope(user);
  const groups = listAgeGroups().filter((g) => scope === null || scope.includes(g.id));
  const canManage = can(user, "program.yonet");
  const current = canManage && (tab === "testler" || tab === "drill") ? tab : "giris";
  const tabs = [
    ["giris", "Veri girişi"],
    ...(canManage
      ? [
          ["testler", "Testler"],
          ["drill", "Drill kütüphanesi"],
        ]
      : []),
  ];
  return (
    <main className="panel-rise mx-auto w-full max-w-4xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Gelişim</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">Boy/kilo ölçümü, fiziksel test sonuçları ve antrenör değerlendirmesi. Veriler velinin gelişim ekranında grafik olarak görünür.</p>
      <nav className="mt-5 flex gap-1 rounded-xl bg-surface p-1">
        {tabs.map(([k, label]) => (
          <a key={k} href={k === "giris" ? "/admin/gelisim" : `/admin/gelisim?sekme=${k}`} aria-current={current === k ? "page" : undefined} className={["flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-sm font-semibold", current === k ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"].join(" ")}>
            {label}
          </a>
        ))}
      </nav>
      <div className="mt-5">
        {current === "giris" ? (
          <DevelopmentEntry groups={groups.map(({ id, name }) => ({ id, name }))} today={todayKey()} />
        ) : (
          <DevelopmentSettings mode={current === "testler" ? "tests" : "drills"} tests={listTests(true)} drills={listDrills(true)} groups={listAgeGroups().map(({ id, name }) => ({ id, name }))} />
        )}
      </div>
    </main>
  );
}
