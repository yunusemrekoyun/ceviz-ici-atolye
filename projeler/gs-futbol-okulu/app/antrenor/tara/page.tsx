import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePortal } from "@/lib/auth/server";
import { getSetting } from "@/lib/settings";
import { QrScanner } from "@/components/staff/QrScanner";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kart okut" };

export default async function CoachScanPage() {
  await requirePortal("coach", "yoklama.al");
  if (!getSetting("cardAttendance")) redirect("/antrenor");
  return (
    <div>
      <h1 className="mb-1 text-2xl font-black text-ink">Kart okut</h1>
      <p className="mb-4 text-muted">Öğrenci kartını kameraya gösterin. Hakkı varsa o anki antrenmana “geldi” yazılır.</p>
      <QrScanner />
    </div>
  );
}
