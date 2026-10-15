"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check } from "lucide-react";
import { EmptyState, Page, PageHeader, Panel } from "@/components/admin/kit";
import { useToast } from "@/components/admin/Toast";
import { Button } from "@/components/ui";
import { shrinkImage } from "@/lib/image-client";
import { attestConsentAction } from "../../metinler/actions";
import { uploadPhotoAction } from "../actions";

export type PhotoStudent = { id: number; name: string; studentNo: number | null; photoFileId: number | null; consent: boolean | null };

type Props = {
  groups: { id: number; name: string; count: number }[];
  groupId: number | null;
  students: PhotoStudent[];
  /** Yayındaki fotoğraf izni metni (izin işlemek için); yoksa izin işlenemez. */
  consentVersionId: number | null;
};

export function PhotoSession({ groups, groupId, students, consentVersionId }: Props) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<number | null>(null);
  const router = useRouter();
  const toast = useToast();

  const withPhoto = students.filter((s) => s.photoFileId).length;
  const waitingConsent = students.filter((s) => s.consent === null).length;
  const refused = students.filter((s) => s.consent === false).length;

  const consent = (s: PhotoStudent, accepted: boolean) => {
    if (!consentVersionId) return;
    setBusyId(s.id);
    startTransition(async () => {
      const res = await attestConsentAction(s.id, consentVersionId, accepted, "Kâğıt formda (fotoğraf çekiminde işlendi)");
      setBusyId(null);
      if (!res.ok) return toast({ kind: "error", text: res.error });
      router.refresh();
    });
  };

  const shoot = (s: PhotoStudent) => {
    target.current = s.id;
    fileRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    const id = target.current;
    if (fileRef.current) fileRef.current.value = "";
    if (!file || id === null) return;
    setBusyId(id);
    const form = new FormData();
    form.set("photo", await shrinkImage(file));
    startTransition(async () => {
      const res = await uploadPhotoAction(id, form);
      setBusyId(null);
      if (!res.ok) return toast({ kind: "error", text: res.error });
      toast({ text: "Fotoğraf kaydedildi." });
      router.refresh();
      // Sıradaki fotoğrafı eksik öğrenciye geç
      const i = students.findIndex((x) => x.id === id);
      const next = students.slice(i + 1).find((x) => x.consent !== false && !x.photoFileId);
      if (next) document.getElementById(`foto-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  return (
    <Page width="narrow">
      <PageHeader
        back={{ href: "/admin/kartlar", label: "Öğrenci Kartları" }}
        title="Fotoğraf çekimi"
        description="Grubu seçin, sırayla her çocuğun fotoğrafını çekin. Fotoğraf yalnız veli izin verdiyse eklenir; izin kâğıt formdaysa buradan işleyin."
      />

      <div className="mb-4 rounded-2xl bg-stone-50 px-4 py-3 text-[15px] text-ink ring-1 ring-inset ring-line">
        Telefonu dik tutun; çocuğun yüzü ortada, arkası sade olsun. Fotoğraf kartta ve yoklamada görünür.
      </div>

      <nav aria-label="Grup" className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {groups.map((g) => {
          const on = g.id === groupId;
          return (
            <Link
              key={g.id}
              href={`/admin/kartlar/foto?grup=${g.id}`}
              replace
              aria-current={on ? "page" : undefined}
              className={[
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[15px] font-semibold transition",
                on ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-inset ring-line hover:bg-stone-50",
              ].join(" ")}
            >
              {g.name}
              <span className={["rounded-full px-1.5 text-xs tabular-nums", on ? "bg-white/20" : "bg-stone-100 text-stone-600"].join(" ")}>{g.count}</span>
            </Link>
          );
        })}
      </nav>

      {students.length ? (
        <p className="mb-3 text-[15px] text-ink">
          <span className="font-semibold">
            {withPhoto} / {students.length}
          </span>{" "}
          öğrencinin fotoğrafı var
          {waitingConsent ? ` · ${waitingConsent} öğrencide izin işlenmedi` : ""}
          {refused ? ` · ${refused} öğrenci izin vermedi` : ""}
        </p>
      ) : null}

      {!consentVersionId ? (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-inset ring-amber-600/25">
          Fotoğraf izni metni yayında değil; izin işlenemiyor. Diğer &gt; Metinler sayfasından “Fotoğraf Kullanım İzni”ni yayınlayın.
        </p>
      ) : null}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      {students.length === 0 ? (
        <Panel>
          <EmptyState title="Bu grupta kayıtlı öğrenci yok" />
        </Panel>
      ) : (
        <ul className="grid gap-3">
          {students.map((s) => {
            const busy = busyId === s.id;
            return (
              <li id={`foto-${s.id}`} key={s.id} className="flex scroll-mt-24 items-center gap-4 rounded-2xl bg-white p-3 shadow-xs ring-1 ring-inset ring-line">
                {s.photoFileId ? (
                  // eslint-disable-next-line @next/next/no-img-element -- yetki kontrollü dosya adresi
                  <img src={`/api/dosya/${s.photoFileId}`} alt="" className="h-24 w-[4.8rem] shrink-0 rounded-xl object-cover ring-1 ring-black/5" />
                ) : (
                  <span className="flex h-24 w-[4.8rem] shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-400" aria-hidden="true">
                    <Camera className="h-7 w-7" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-bold leading-snug text-ink">{s.name}</p>
                  <p className="text-sm text-muted">{s.studentNo ? `No ${s.studentNo}` : "Numara yok"}</p>
                  {s.consent === true ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button type="button" size="md" variant={s.photoFileId ? "secondary" : "primary"} onClick={() => shoot(s)} loading={busy}>
                        <Camera className="h-4 w-4" aria-hidden="true" /> {s.photoFileId ? "Yeniden çek" : "Fotoğraf çek"}
                      </Button>
                      {s.photoFileId ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                          <Check className="h-4 w-4" aria-hidden="true" /> Tamam
                        </span>
                      ) : null}
                    </div>
                  ) : s.consent === false ? (
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                      Veli fotoğraf izni vermedi.
                      {consentVersionId ? (
                        <button type="button" disabled={busy} onClick={() => consent(s, true)} className="min-h-11 cursor-pointer rounded-lg px-1 font-semibold text-gs-red hover:underline">
                          İzin verdi olarak değiştir
                        </button>
                      ) : null}
                    </p>
                  ) : consentVersionId ? (
                    <div className="mt-2">
                      <p className="text-sm text-muted">Veli fotoğraf izni verdi mi?</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <Button type="button" size="md" variant="secondary" onClick={() => consent(s, true)} loading={busy}>
                          Evet, izin verdi
                        </Button>
                        <Button type="button" size="md" variant="ghost" onClick={() => consent(s, false)} disabled={busy}>
                          Hayır
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted">Fotoğraf izni işlenmedi.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
