"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DUPLICATE_MESSAGE, SUCCESS_MESSAGE_LINE_1, SUCCESS_MESSAGE_LINE_2 } from "@/lib/constants";
import {
  emptyFormValues,
  validateRegistration,
  type FieldErrors,
  type RegistrationField,
  type RegistrationFormValues,
} from "@/lib/validation";
import {
  EMERGENCY_FIELDS,
  EmergencyFieldsCard,
  FAMILY_FIELDS,
  FamilyFieldsCard,
  STUDENT_FIELDS,
  StudentFieldsCard,
} from "@/components/RegistrationFields";
import { Alert, Button } from "@/components/ui";

const STEPS = [
  { title: "Öğrenci Bilgileri", fields: STUDENT_FIELDS },
  { title: "Aile Bilgileri", fields: FAMILY_FIELDS },
  { title: "Acil Durum", fields: EMERGENCY_FIELDS },
] as const;

const ID_PREFIX = "onkayit";
const LAST_SUBMISSION_KEY = "gs-on-kayit:last-submission";
const LAST_SUBMISSION_TTL_MS = 12 * 60 * 60 * 1000;

type LastSubmission = { at: number; studentName: string };

// localStorage'daki "son gönderim" bilgisi useSyncExternalStore ile okunur:
// sunucuda null, istemcide gerçek değer; aynı sekmede yazma sonrası dinleyiciler tetiklenir.
const storeListeners = new Set<() => void>();

function subscribeLastSubmission(callback: () => void) {
  storeListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    storeListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getLastSubmissionSnapshot(): string | null {
  try {
    return window.localStorage.getItem(LAST_SUBMISSION_KEY);
  } catch {
    return null;
  }
}

function getLastSubmissionServerSnapshot(): string | null {
  return null;
}

function parseLastSubmission(raw: string | null): LastSubmission | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LastSubmission>;
    if (typeof parsed.at !== "number" || typeof parsed.studentName !== "string") return null;
    if (Date.now() - parsed.at > LAST_SUBMISSION_TTL_MS) return null;
    return { at: parsed.at, studentName: parsed.studentName };
  } catch {
    return null;
  }
}

function writeLastSubmission(value: LastSubmission | null) {
  try {
    if (value) window.localStorage.setItem(LAST_SUBMISSION_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(LAST_SUBMISSION_KEY);
  } catch {
    // localStorage kapalıysa sessizce geç; sunucu tarafı UNIQUE kısıtı zaten koruyor.
  }
  storeListeners.forEach((listener) => listener());
}

function firstErrorField(errors: FieldErrors, orderedFields: readonly RegistrationField[]): RegistrationField | null {
  for (const f of orderedFields) if (errors[f]) return f;
  return null;
}

function focusField(field: RegistrationField) {
  const el = document.getElementById(`${ID_PREFIX}-${field}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => el.focus({ preventScroll: true }), 250);
}

type Status = "idle" | "submitting" | "success";

export function RegistrationForm() {
  const [values, setValues] = useState<RegistrationFormValues>(emptyFormValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [submittedName, setSubmittedName] = useState<string>("");
  const lastSubmissionRaw = useSyncExternalStore(subscribeLastSubmission, getLastSubmissionSnapshot, getLastSubmissionServerSnapshot);
  const lastSubmission = useMemo(() => parseLastSubmission(lastSubmissionRaw), [lastSubmissionRaw]);
  const submittingRef = useRef(false);
  const dirtyRef = useRef(false);

  // Doldurulmakta olan form kapatılmak istenirse uyar (yanlışlıkla kaybı azaltır).
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current && status === "idle") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  const onChange = useCallback((field: RegistrationField, value: string) => {
    dirtyRef.current = true;
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormError(null);
  }, []);

  const currentStep = STEPS[step] ?? STEPS[0];
  const isLastStep = step === STEPS.length - 1;

  const stepErrorCounts = useMemo(
    () => STEPS.map((s) => s.fields.filter((f) => Boolean(errors[f])).length),
    [errors],
  );

  function goNext() {
    const result = validateRegistration(values);
    if (!result.success) {
      const stepErrors: FieldErrors = {};
      for (const f of currentStep.fields) if (result.errors[f]) stepErrors[f] = result.errors[f];
      if (Object.keys(stepErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...stepErrors }));
        const first = firstErrorField(stepErrors, currentStep.fields);
        if (first) focusField(first);
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpToErrors(errs: FieldErrors) {
    for (let i = 0; i < STEPS.length; i++) {
      const first = firstErrorField(errs, STEPS[i]!.fields);
      if (first) {
        setStep(i);
        window.setTimeout(() => focusField(first), 50);
        return;
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current || status !== "idle") return;

    const result = validateRegistration(values);
    if (!result.success) {
      setErrors(result.errors);
      setFormError(result.formError ?? "Lütfen işaretli alanları kontrol ediniz.");
      jumpToErrors(result.errors);
      return;
    }

    submittingRef.current = true;
    setStatus("submitting");
    setFormError(null);

    try {
      const res = await fetch("/api/on-kayit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        errors?: FieldErrors;
        formError?: string;
      };

      if (res.ok && data.ok) {
        const studentName = result.data.studentFullName;
        setSubmittedName(studentName);
        writeLastSubmission({ at: Date.now(), studentName });
        dirtyRef.current = false;
        setStatus("success");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const serverErrors = data.errors ?? {};
      setErrors(serverErrors);
      setFormError(
        data.formError ??
          (res.status === 409 ? DUPLICATE_MESSAGE : "Kayıt gönderilemedi. Lütfen tekrar deneyiniz."),
      );
      setStatus("idle");
      if (Object.keys(serverErrors).length > 0) jumpToErrors(serverErrors);
      else window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Bağlantı hatası oluştu. İnternet bağlantınızı kontrol edip tekrar deneyiniz.");
      setStatus("idle");
    } finally {
      submittingRef.current = false;
    }
  }

  function startNewRegistration() {
    writeLastSubmission(null);
    setValues(emptyFormValues());
    setErrors({});
    setFormError(null);
    setStep(0);
    setSubmittedName("");
    dirtyRef.current = false;
    setStatus("idle");
    window.scrollTo({ top: 0 });
  }

  if (status === "success" || (status === "idle" && lastSubmission)) {
    const name = status === "success" ? submittedName : (lastSubmission?.studentName ?? "");
    return (
      <div className="rounded-2xl border border-green-300 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
          <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-bold text-ink">{SUCCESS_MESSAGE_LINE_1}</h2>
        <p className="mt-2 text-base text-ink">{SUCCESS_MESSAGE_LINE_2}</p>
        {name ? (
          <p className="mt-4 rounded-xl bg-surface px-4 py-2 text-sm text-muted">
            Kaydı alınan öğrenci: <span className="font-semibold text-ink">{name}</span>
          </p>
        ) : null}
        {status === "idle" ? (
          <p className="mt-3 text-sm text-muted">Bu cihazdan kısa süre önce bir kayıt gönderildi. Aynı öğrenciyi tekrar kaydetmeyiniz.</p>
        ) : null}
        <div className="mt-6">
          <Button type="button" variant="secondary" onClick={startNewRegistration}>
            Başka bir öğrenci için yeni kayıt
          </Button>
        </div>
      </div>
    );
  }

  const busy = status === "submitting";

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <Alert kind="info">
        Lütfen bilgileri fiziksel kayıt formundakiyle aynı şekilde giriniz. <strong>*</strong> işaretli alanlar zorunludur.
      </Alert>

      <nav aria-label="Form adımları" className="flex items-center justify-between gap-2 px-1">
        {STEPS.map((s, i) => {
          const isActive = i === step;
          const isDone = i < step;
          const hasError = stepErrorCounts[i]! > 0;
          return (
            <button
              key={s.title}
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step || busy}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center disabled:cursor-default"
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                  hasError
                    ? "bg-red-600 text-white"
                    : isActive
                      ? "bg-gs-red text-white"
                      : isDone
                        ? "bg-gs-yellow text-ink"
                        : "bg-gray-200 text-gray-600",
                ].join(" ")}
              >
                {i + 1}
              </span>
              <span className={["text-[11px] font-semibold leading-tight", isActive ? "text-gs-red" : "text-muted"].join(" ")}>
                {s.title}
              </span>
            </button>
          );
        })}
      </nav>

      {formError ? <Alert kind="error">{formError}</Alert> : null}

      {step === 0 ? (
        <StudentFieldsCard values={values} errors={errors} onChange={onChange} disabled={busy} idPrefix={ID_PREFIX} step="1" />
      ) : null}
      {step === 1 ? (
        <FamilyFieldsCard values={values} errors={errors} onChange={onChange} disabled={busy} idPrefix={ID_PREFIX} step="2" />
      ) : null}
      {step === 2 ? (
        <EmergencyFieldsCard values={values} errors={errors} onChange={onChange} disabled={busy} idPrefix={ID_PREFIX} step="3" />
      ) : null}

      <div className="flex gap-3">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={goBack} disabled={busy} className="flex-1">
            Geri
          </Button>
        ) : null}
        {isLastStep ? (
          <Button type="submit" loading={busy} disabled={busy} className="flex-1">
            {busy ? "Gönderiliyor…" : "Kaydı Gönder"}
          </Button>
        ) : (
          <Button type="button" onClick={goNext} disabled={busy} className="flex-1">
            Devam
          </Button>
        )}
      </div>

      {isLastStep ? (
        <p className="text-center text-xs text-muted">
          Gönder butonuna bastıktan sonra bilgileriniz kaydedilir; aynı öğrenci için ikinci bir kayıt yapılamaz.
        </p>
      ) : null}
    </form>
  );
}
