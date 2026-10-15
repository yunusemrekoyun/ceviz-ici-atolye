import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { listAgeGroups } from "@/lib/age-groups-db";
import { getDb } from "@/lib/db";
import { registrations } from "@/lib/db/schema";
import { hasPhotoConsentMap, listPublishedTexts } from "@/lib/legal";
import { PhotoSession, type PhotoStudent } from "./PhotoSession";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fotoğraf çekimi" };

/**
 * Sahada grup grup fotoğraf çekimi: öğrenciler ada göre; izni işlenmemişse kâğıttaki izin tek dokunuşla işlenir,
 * izni olanın fotoğrafı telefon kamerasıyla çekilir.
 */
export default async function PhotoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("kayit.duzenle");
  const { grup } = await searchParams;
  const groups = listAgeGroups();
  const enrolled = getDb().select().from(registrations).where(eq(registrations.status, "enrolled")).all();
  const count = (id: number | null) => enrolled.filter((r) => (r.groupId ?? null) === id).length;
  const options = [...groups.map((g) => ({ id: g.id, name: g.name, count: count(g.id) })), ...(count(null) ? [{ id: 0, name: "Grupsuz", count: count(null) }] : [])];
  const selected = options.find((o) => o.id === Number(grup)) ?? options.find((o) => o.count > 0) ?? options[0] ?? null;
  const groupId = selected && selected.id !== 0 ? selected.id : null;
  const list = selected ? enrolled.filter((r) => (r.groupId ?? null) === groupId).sort((a, b) => a.studentFullName.localeCompare(b.studentFullName, "tr")) : [];
  const consent = hasPhotoConsentMap(list.map((r) => r.id));
  const students: PhotoStudent[] = list.map((r) => ({ id: r.id, name: r.studentFullName, studentNo: r.studentNo, photoFileId: r.photoFileId, consent: consent.get(r.id) ?? null }));
  const photoText = listPublishedTexts().find(({ text }) => text.key === "foto-izni");

  return <PhotoSession key={selected?.id ?? "none"} groups={options} groupId={selected?.id ?? null} students={students} consentVersionId={photoText?.version.id ?? null} />;
}
