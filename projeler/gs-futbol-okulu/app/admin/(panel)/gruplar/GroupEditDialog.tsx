"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Merge, UserMinus, Users } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import { formatYearRange, type AgeGroupView } from "@/lib/age-groups";
import type { PlanStudent, RangePlan } from "@/lib/group-ranges";
import { saveAgeGroupAction, type AgeGroupFormValues, type SaveGroupResult } from "../actions";

/**
 * Grubun adı ve doğum yılı aralığı (yeni grup için de). Aralık başka grupların yıllarına taşıyorsa kaydetmeden
 * önce aynı pencerede ne olacağı gösterilir: birleşen gruplar, daralan gruplar, taşınacak öğrenciler.
 */
export function GroupEditDialog({ group, onClose, onSaved }: { group: AgeGroupView | null; onClose: () => void; onSaved: (text: string) => void }) {
  const [values, setValues] = useState<AgeGroupFormValues>({
    name: group?.name ?? "",
    minBirthYear: group ? String(group.minBirthYear) : "",
    maxBirthYear: group ? String(group.maxBirthYear) : "",
  });
  const [result, setResult] = useState<SaveGroupResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const plan = result && !result.ok && "plan" in result ? result.plan : null;
  const errors = result && !result.ok && "fieldErrors" in result ? (result.fieldErrors ?? {}) : {};
  const error = result && !result.ok && !plan && !("fieldErrors" in result && result.fieldErrors) ? result.error : null;
  const set = (key: keyof AgeGroupFormValues) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const name = values.name.trim() || "Bu grup";
  const years = formatYearRange({ minBirthYear: Number(values.minBirthYear), maxBirthYear: Number(values.maxBirthYear) });

  const save = (confirmed: boolean) =>
    startTransition(async () => {
      const res = await saveAgeGroupAction(group?.id ?? null, values, confirmed);
      setResult(res);
      if (!res.ok) return;
      router.refresh();
      onSaved(confirmed && plan?.merged.length ? `${plan.merged.map((m) => m.name).join(", ")}, ${name} ile birleşti.` : group ? "Grup güncellendi." : "Grup eklendi.");
    });

  const confirmLabel = plan?.merged.length ? "Birleştir" : plan && moveCount(plan) ? "Kaydet ve taşı" : "Kaydet";

  return (
    <Modal
      open
      size={plan ? "lg" : "md"}
      title={plan ? "Kaydetmeden önce" : group ? "Grubun adı ve yaşları" : "Yeni grup"}
      onClose={onClose}
      closeDisabled={pending}
      dismissOnOverlay={false}
      footer={
        plan ? (
          <>
            <Button type="button" variant="secondary" onClick={() => setResult(null)} disabled={pending}>
              Geri dön
            </Button>
            <Button type="button" onClick={() => save(true)} loading={pending}>
              {confirmLabel}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="button" onClick={() => save(false)} loading={pending}>
              Kaydet
            </Button>
          </>
        )
      }
    >
      {plan ? (
        <PlanView plan={plan} name={name} years={years} isNew={!group} />
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save(false);
          }}
        >
          {error ? <Alert>{error}</Alert> : null}
          <Field label="Grup adı" htmlFor="group-name" required error={errors.name}>
            <Input id="group-name" value={values.name} onChange={set("name")} invalid={Boolean(errors.name)} placeholder="örn. 1. Grup" autoFocus={!group} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Doğum yılı (en eski)" htmlFor="group-min" required error={errors.minBirthYear}>
              <Input id="group-min" inputMode="numeric" value={values.minBirthYear} onChange={set("minBirthYear")} invalid={Boolean(errors.minBirthYear)} placeholder="2011" />
            </Field>
            <Field label="Doğum yılı (en yeni)" htmlFor="group-max" required error={errors.maxBirthYear}>
              <Input id="group-max" inputMode="numeric" value={values.maxBirthYear} onChange={set("maxBirthYear")} invalid={Boolean(errors.maxBirthYear)} placeholder="2014" />
            </Field>
          </div>
          <p className="rounded-xl bg-stone-50 px-3.5 py-3 text-sm text-muted">
            <span className="font-semibold text-ink">İki grubu birleştirmek için</span> bu grubun yıllarını ikisini de kapsayacak şekilde yazın (ör. 2011 ve 2014). Kaydetmeden önce
            hangi öğrencilerin geçeceğini gösteririz.
          </p>
          <button type="submit" className="hidden" />
        </form>
      )}
    </Modal>
  );
}

const moveCount = (plan: RangePlan) => plan.merged.reduce((n, m) => n + m.students.length, 0) + plan.trimmed.reduce((n, t) => n + t.students.length, 0) + plan.adopted.length;

function Names({ students }: { students: PlanStudent[] }) {
  if (!students.length) return null;
  return <p className="mt-1 line-clamp-3 text-sm text-muted">{students.map((s) => s.name).join(", ")}</p>;
}

function PlanView({ plan, name, years, isNew }: { plan: RangePlan; name: string; years: string; isNew: boolean }) {
  const moved = moveCount(plan);
  const takeover = plan.merged.find((m) => m.id === plan.takeoverFrom);
  return (
    <div className="grid gap-3 text-[15px] text-ink">
      <div className="rounded-xl bg-stone-50 px-4 py-3">
        <p className="text-sm text-muted">{isNew ? "Yeni grup" : "Bu grup"}</p>
        <p className="text-lg font-bold">
          {name} · {years} doğumlular
        </p>
      </div>

      {plan.merged.map((m) => (
        <section key={m.id} className="rounded-xl px-4 py-3 ring-1 ring-inset ring-line">
          <p className="flex items-start gap-2 font-semibold">
            <Merge className="mt-0.5 h-5 w-5 shrink-0 text-gs-red" aria-hidden="true" />
            <span>
              {m.name} ({m.years}) bu gruba katılır
            </span>
          </p>
          <ul className="mt-2 grid gap-1.5 pl-7">
            <li>
              {m.students.length ? `${m.students.length} öğrencisi ${name} grubuna geçer.` : "Bu grupta kayıtlı öğrenci yok."}
              <Names students={m.students} />
            </li>
            {m.coaches.length ? <li>Antrenörü {m.coaches.join(", ")} bu gruba da eklenir.</li> : null}
            {m.schedule ? (
              takeover?.id === m.id ? (
                <li>Antrenman günleri ({m.schedule}) bu gruba geçer.</li>
              ) : (
                <li>
                  Kendi antrenmanları ({m.schedule}) kalkar
                  {m.students.length ? `; öğrencileri ${plan.schedule ? `bu grubun antrenmanlarına (${plan.schedule}) gelir.` : "bu grubun antrenmanlarına gelir."}` : "."}
                </li>
              )
            ) : null}
            <li className="text-sm text-muted">{m.name} listelerden kalkar. Geçmiş yoklamaları silinmez.</li>
          </ul>
        </section>
      ))}

      {plan.trimmed.map((t) => (
        <section key={t.id} className="rounded-xl px-4 py-3 ring-1 ring-inset ring-line">
          <p className="flex items-start gap-2 font-semibold">
            <ArrowRight className="mt-0.5 h-5 w-5 shrink-0 text-gs-red" aria-hidden="true" />
            <span>
              {t.name} {t.givenYears} doğumluları bu gruba verir
            </span>
          </p>
          <p className="mt-1 pl-7">
            {t.students.length ? `${t.students.length} öğrencisi ${name} grubuna geçer.` : "Bu yıllarda kayıtlı öğrencisi yok."} {t.name} artık {t.newYears} doğumlular.
          </p>
          <div className="pl-7">
            <Names students={t.students} />
          </div>
        </section>
      ))}

      {plan.adopted.length ? (
        <section className="rounded-xl px-4 py-3 ring-1 ring-inset ring-line">
          <p className="flex items-start gap-2 font-semibold">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-gs-red" aria-hidden="true" />
            <span>Hiçbir grubun yaşında olmayan {plan.adopted.length} öğrenci bu gruba girer</span>
          </p>
          <div className="pl-7">
            <Names students={plan.adopted} />
          </div>
        </section>
      ) : null}

      {plan.leaving.length ? (
        <section className="rounded-xl bg-amber-50 px-4 py-3 text-amber-950 ring-1 ring-inset ring-amber-600/25">
          <p className="flex items-start gap-2 font-semibold">
            <UserMinus className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{plan.leaving.length} öğrenci yeni yaş aralığının dışında kalıyor</span>
          </p>
          <p className="mt-1 pl-7 text-sm">Başka bir grubun yaşına da girmiyorlar; bu grupta kalırlar. Gerekirse öğrenci dosyasından grubunu değiştirin.</p>
          <div className="pl-7">
            <Names students={plan.leaving} />
          </div>
        </section>
      ) : null}

      {plan.candidates ? <p className="text-sm text-muted">{plan.candidates} aday da bu grupta görünecek.</p> : null}
      {moved ? (
        <p className="text-sm text-muted">
          Geçen öğrencilerin ödemeleri ve kalan antrenman hakları korunur; kalan antrenmanlar {name} grubunun günlerinden sayılır.
          {!plan.schedule && !takeover ? " Bu grubun antrenman programı yok; programı grup sayfasından girin." : ""}
        </p>
      ) : null}
    </div>
  );
}
