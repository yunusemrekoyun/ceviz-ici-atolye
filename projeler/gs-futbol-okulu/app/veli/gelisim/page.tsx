import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { loadGuardian, SIMPLE_PANEL } from "@/lib/guardian-view";
import { progressOf } from "@/lib/development";
import { getSettings } from "@/lib/settings";
import { ChildTabs, NoChildren } from "@/components/guardian/ChildTabs";
import { ProgressView } from "@/components/development/ProgressView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gelişim" };

/** Gelişim vitrini (VEL-10): ilk günden bugüne. */
export default async function GuardianProgress({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Sade panel (VEL-17): bu sayfa şimdilik kapalı
  if (SIMPLE_PANEL) {
    const o = (await searchParams).ogrenci;
    redirect(typeof o === "string" ? `/veli?ogrenci=${encodeURIComponent(o)}` : "/veli");
  }
  const { children, child } = await loadGuardian((await searchParams).ogrenci, { requireAccess: true });
  if (!child) return <NoChildren />;
  return (
    <div className="grid gap-4">
      <ChildTabs kids={children} selectedId={child.id} base="/veli/gelisim" />
      <h1 className="text-2xl font-black text-ink">{child.studentFullName.split(" ")[0]} nasıl gelişiyor?</h1>
      <ProgressView progress={progressOf(child.id)} criteria={getSettings().evaluationCriteria} audience="guardian" />
    </div>
  );
}
