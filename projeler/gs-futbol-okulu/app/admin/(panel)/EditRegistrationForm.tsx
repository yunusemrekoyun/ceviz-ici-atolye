"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import type { RegistrationDto } from "@/lib/api";
import { registrationToFormValues } from "@/lib/registrations-client";
import { emptyFormValues, type FieldErrors, type RegistrationField, type RegistrationFormValues } from "@/lib/registration-fields";
import { EmergencyFieldsCard, FamilyFieldsCard, StudentFieldsCard } from "@/components/RegistrationFields";
import { Alert, Button } from "@/components/ui";

const ID_PREFIX = "edit";

/** Yeni kayıtta: aday olarak kalsın mı, hemen asıl kayda mı geçilsin. */
export type SaveIntent = "candidate" | "enroll";

type Props = {
  /** Boşsa yeni kayıt eklenir. */
  reg: RegistrationDto | null;
  onSaved: (updated: RegistrationDto, intent: SaveIntent) => void;
  onCancel: () => void;
  /** Veri kontrolünden gelindiyse açılınca bu alana gidilir. */
  focusField?: RegistrationField | null;
  /** Kayıtlı bilgideki hatalar (sunucuda hesaplanır). */
  initialErrors?: FieldErrors;
};

export function EditRegistrationForm({ reg, onSaved, onCancel, focusField, initialErrors }: Props) {
  const [values, setValues] = useState<RegistrationFormValues>(() => (reg ? registrationToFormValues(reg) : { ...emptyFormValues(), contactParentType: "anne" }));
  // Kayıtlı bilgide hatalı alan varsa (ör. geçersiz T.C.) sunucu hesaplar, açılır açılmaz işaretlenir.
  const [errors, setErrors] = useState<FieldErrors>(initialErrors ?? {});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [intent, setIntent] = useState<SaveIntent>("candidate");

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

  useEffect(() => {
    if (!focusField) return;
    const el = document.getElementById(`${ID_PREFIX}-${focusField}`);
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
      if (el instanceof HTMLInputElement) el.select();
    }, 250);
    return () => window.clearTimeout(t);
  }, [focusField]);

  function focusFirstError(errs: FieldErrors) {
    const first = (Object.keys(errs) as RegistrationField[])[0];
    if (!first) return;
    const el = document.getElementById(`${ID_PREFIX}-${first}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => el?.focus({ preventScroll: true }), 200);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (savingRef.current) return;
    // Hangi düğmeyle gönderildi: "aday olarak kaydet" mi, "asıl kayda geç" mi.
    const chosen: SaveIntent = (e.nativeEvent as SubmitEvent).submitter?.dataset.intent === "enroll" ? "enroll" : "candidate";
    setIntent(chosen);

    // Doğrulama sunucuda: hatalı alanlar yanıtla gelir ve işaretlenir.
    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    try {
      const res = await adminFetch(reg ? `/api/admin/registrations/${reg.id}` : "/api/admin/registrations", {
        method: reg ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        registration?: RegistrationDto;
        errors?: FieldErrors;
        formError?: string;
      };
      if (res.ok && data.ok && data.registration) {
        onSaved(data.registration, chosen);
        return;
      }
      setErrors(data.errors ?? {});
      setFormError(data.formError ?? (data.errors ? null : reg ? "Kayıt güncellenemedi." : "Kayıt eklenemedi."));
      if (data.errors) focusFirstError(data.errors);
    } catch {
      setFormError("Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {formError ? <Alert kind="error">{formError}</Alert> : null}
      {!formError && Object.keys(errors).length ? <Alert kind="error">Kırmızı işaretli alanlardaki bilgi hatalı; düzeltip kaydedin.</Alert> : null}
      <StudentFieldsCard lenient values={values} errors={errors} onChange={onChange} disabled={saving} idPrefix={ID_PREFIX} />
      <FamilyFieldsCard lenient values={values} errors={errors} onChange={onChange} disabled={saving} idPrefix={ID_PREFIX} />
      <EmergencyFieldsCard lenient values={values} errors={errors} onChange={onChange} disabled={saving} idPrefix={ID_PREFIX} />
      <div className="no-print sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 -mx-4 flex flex-col-reverse gap-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:flex-row sm:justify-end sm:rounded-2xl sm:border sm:px-4 lg:bottom-4">
        <Button type="button" size="md" variant="ghost" onClick={onCancel} disabled={saving} className="text-muted hover:bg-surface">
          Vazgeç
        </Button>
        {reg ? (
          <Button type="submit" size="md" loading={saving}>
            Değişiklikleri kaydet
          </Button>
        ) : (
          <>
            <Button type="submit" size="md" variant="secondary" data-intent="candidate" loading={saving && intent === "candidate"} disabled={saving}>
              Aday olarak ekle
            </Button>
            <Button type="submit" size="md" data-intent="enroll" loading={saving && intent === "enroll"} disabled={saving}>
              Ekle ve okula kaydet
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
