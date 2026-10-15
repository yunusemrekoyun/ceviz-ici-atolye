"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { submitInfoAction } from "../actions";
import { EMERGENCY_FIELDS, EmergencyFieldsCard, FAMILY_FIELDS, FamilyFieldsCard, STUDENT_FIELDS, StudentFieldsCard } from "@/components/RegistrationFields";
import { validateRegistration, type FieldErrors, type RegistrationField, type RegistrationFormValues } from "@/lib/validation";

const ORDER: RegistrationField[] = [...STUDENT_FIELDS, ...FAMILY_FIELDS, ...EMERGENCY_FIELDS];
const ID_PREFIX = "veli";

function focusFirst(errors: FieldErrors) {
  const first = ORDER.find((f) => errors[f]);
  const el = first ? document.getElementById(`${ID_PREFIX}-${first}`) : null;
  if (!el) return;
  el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
  window.setTimeout(() => el.focus({ preventScroll: true }), 250);
}

/** Velinin bilgileri tamamladığı form: mevcut bilgilerle dolu gelir, eksik ve hatalı alanlar işaretlidir. */
export function InfoForm({ registrationId, initialValues, initialErrors, backHref }: { registrationId: number; initialValues: RegistrationFormValues; initialErrors: FieldErrors; backHref: string }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors>(initialErrors);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, startTransition] = useTransition();

  const onChange = useCallback((field: RegistrationField, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormError(null);
  }, []);

  if (done)
    return (
      <div className="veli-card p-6 text-center">
        <p className="veli-title text-[32px] text-[var(--v-red)]">Teşekkürler</p>
        <p className="mt-2 text-[16px]">Bilgileriniz okula gönderildi. Okul kontrol edip onaylayınca profilinizde görünecek.</p>
        <Link href={backHref} className="veli-btn veli-btn--primary mt-5 w-full">
          Profile dön
        </Link>
      </div>
    );

  return (
    <form
      noValidate
      className="veli-info-form grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const check = validateRegistration(values);
        if (!check.success) {
          setErrors(check.errors);
          setFormError(check.formError ?? "Lütfen işaretli alanları doldurun.");
          focusFirst(check.errors);
          return;
        }
        startTransition(async () => {
          const res = await submitInfoAction(registrationId, values);
          if (res.ok) {
            setDone(true);
            window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
            return;
          }
          setFormError(res.error);
          if ("errors" in res) {
            setErrors(res.errors);
            focusFirst(res.errors);
          }
        });
      }}
    >
      {formError ? (
        <p role="alert" className="rounded-md border border-[#f0c9d3] bg-[#fdf3f6] px-4 py-3 text-[15px] font-medium text-[var(--v-red)]">
          {formError}
        </p>
      ) : null}
      <StudentFieldsCard values={values} errors={errors} onChange={onChange} disabled={busy} idPrefix={ID_PREFIX} />
      <FamilyFieldsCard values={values} errors={errors} onChange={onChange} disabled={busy} idPrefix={ID_PREFIX} />
      <EmergencyFieldsCard values={values} errors={errors} onChange={onChange} disabled={busy} idPrefix={ID_PREFIX} />
      <button type="submit" disabled={busy} className="veli-btn veli-btn--primary w-full disabled:opacity-60">
        {busy ? "Gönderiliyor…" : "Okula gönder"}
      </button>
      <p className="text-center text-[13px] text-[var(--v-muted)]">Bilgileriniz okul onaylayınca kaydınıza işlenir.</p>
    </form>
  );
}
