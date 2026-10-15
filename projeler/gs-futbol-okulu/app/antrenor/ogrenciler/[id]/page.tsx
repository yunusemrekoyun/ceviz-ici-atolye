import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortal } from "@/lib/auth/server";
import { studentAttendance, summarize } from "@/lib/attendance";
import { ACCESS_BADGE, ACCESS_LABELS, dayLabel } from "@/lib/billing-shared";
import { formatDateTr } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { getRegistration } from "@/lib/registrations";
import { fieldStudent, groupScope, inScope } from "@/lib/scan";
import { telLink } from "@/lib/whatsapp";
import { progressOf } from "@/lib/development";
import { getSettings } from "@/lib/settings";
import { ProgressView } from "@/components/development/ProgressView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Öğrenci" };

/** Antrenörün gördüğü öğrenci kartı: TC, adres ve aidat tutarı yok (GUV-07). */
export default async function CoachStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePortal("coach");
  const id = Number((await params).id);
  const reg = Number.isInteger(id) && id > 0 ? getRegistration(id) : null;
  if (!reg || reg.status !== "enrolled" || !inScope(groupScope(user), reg.groupId)) notFound();
  const s = fieldStudent(reg);
  const records = studentAttendance(reg.id, 40);
  const sum = summarize(records);
  return (
    <div className="grid gap-4">
      <Link href="/antrenor/ogrenciler" className="text-sm font-semibold text-gs-red">
        ← Öğrenciler
      </Link>
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          {s.photoFileId ? (
            // eslint-disable-next-line @next/next/no-img-element -- yetki kontrollü dosya adresi
            <img src={`/api/dosya/${s.photoFileId}`} alt="" className="h-28 w-22 shrink-0 rounded-xl object-cover" />
          ) : null}
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-ink">{s.name}</h1>
            <p className="text-muted">
              No {s.studentNo ?? "—"} · {s.groupName ?? "Grupsuz"}
              {reg.isGoalkeeper ? " · Kaleci" : ""}
            </p>
            <span className={`mt-2 inline-block rounded-lg px-2.5 py-1 text-sm font-bold ${ACCESS_BADGE[s.access]}`}>{s.allowed ? "Antrenman hakkı var" : ACCESS_LABELS[s.access]}</span>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 text-[15px]">
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Doğum tarihi</dt>
            <dd className="text-ink">{formatDateTr(s.birthDate) || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Kan grubu</dt>
            <dd className="text-ink">{s.bloodGroup || "—"}</dd>
          </div>
          {s.contactPhone ? (
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Veli</dt>
              <dd className="text-ink">
                {s.contactName} ·{" "}
                <a href={telLink(s.contactPhone)} className="font-semibold text-gs-red">
                  {formatPhone(s.contactPhone)}
                </a>
              </dd>
            </div>
          ) : null}
          {s.emergencyPhone ? (
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Acil durum kişisi</dt>
              <dd className="text-ink">
                {s.emergencyName} ({s.emergencyRelation}) ·{" "}
                <a href={telLink(s.emergencyPhone)} className="font-semibold text-gs-red">
                  {formatPhone(s.emergencyPhone)}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
      <ProgressView progress={progressOf(reg.id)} criteria={getSettings().evaluationCriteria} />
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-bold text-ink">Devam</h2>
        <p className="mt-1 text-sm text-muted">
          {sum.present} geldi · {sum.absent} gelmedi · {sum.excused} izinli{sum.rate !== null ? ` · %${sum.rate}` : ""}
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {records.slice(0, 24).map((r) => (
            <li
              key={r.id}
              title={`${dayLabel(r.date)} ${r.startTime}`}
              className={["h-7 w-7 rounded-md text-center text-xs font-bold leading-7", r.status === "present" ? "bg-emerald-500 text-white" : r.status === "absent" ? "bg-red-500 text-white" : "bg-sky-200 text-sky-900"].join(" ")}
            >
              {r.status === "present" ? "✓" : r.status === "absent" ? "✗" : "İ"}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
