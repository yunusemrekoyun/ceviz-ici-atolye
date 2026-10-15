"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { Alert, Button } from "@/components/ui";
import type { ActionResult } from "@/lib/admin-action";
import type { RegistrationDto } from "@/lib/api";
import { registrationToFormValues } from "@/lib/registrations-client";
import { STATUS_LABELS, type RegistrationStatus } from "@/lib/registration-status";
import { applySubmissionAction, dismissSubmissionAction, mergeRegistrationsAction } from "./actions";
import { REGISTRATION_FIELDS, type RegistrationField, type RegistrationFormValues } from "@/lib/registration-fields";

const LABELS: Record<RegistrationField, string> = {
  studentTc: "Öğrenci T.C.",
  studentFullName: "Öğrenci adı soyadı",
  birthDate: "Doğum tarihi",
  homeAddress: "Ev adresi",
  studentPhone: "İrtibat telefonu",
  bloodGroup: "Kan grubu",
  email: "E-posta",
  fatherFullName: "Baba adı soyadı",
  fatherTc: "Baba T.C.",
  fatherPhone: "Baba GSM",
  motherFullName: "Anne adı soyadı",
  motherTc: "Anne T.C.",
  motherPhone: "Anne GSM",
  contactParentType: "İletişim velisi",
  contactParentFullName: "İletişim velisi adı",
  contactParentPhone: "İletişim velisi telefonu",
  emergencyFullName: "Acil durum kişisi",
  emergencyRelation: "Yakınlık",
  emergencyPhone: "Acil durum telefonu",
};

const same = (a: string, b: string) => a.replace(/\s/g, "").toLocaleLowerCase("tr-TR") === b.replace(/\s/g, "").toLocaleLowerCase("tr-TR");

type Side = { label: string; values: RegistrationFormValues };

/**
 * İki bilgi kümesini alan alan karşılaştırır; farklı alanlarda hangisinin kalacağı seçilir.
 * Varsayılan: boş olmayan değer; ikisi de doluysa `preferRight` ise sağdaki (yeni gelen).
 */
export function CompareDialog({
  title,
  left,
  right,
  preferRight,
  confirmLabel,
  note,
  onConfirm,
  onClose,
  extraAction,
}: {
  title: string;
  left: Side;
  right: Side;
  preferRight: boolean;
  confirmLabel: string;
  note?: string;
  onConfirm: (values: RegistrationFormValues) => Promise<ActionResult>;
  onClose: () => void;
  extraAction?: { label: string; run: () => Promise<ActionResult> };
}) {
  const diff = useMemo(() => REGISTRATION_FIELDS.filter((f) => !same(left.values[f] ?? "", right.values[f] ?? "")), [left, right]);
  const [pick, setPick] = useState<Record<string, "left" | "right">>(() =>
    Object.fromEntries(
      diff.map((f) => {
        const l = (left.values[f] ?? "").trim();
        const r = (right.values[f] ?? "").trim();
        return [f, !l ? "right" : !r ? "left" : preferRight ? "right" : "left"];
      }),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const values = { ...left.values };
      for (const f of diff) if (pick[f] === "right") values[f] = right.values[f];
      const res = await onConfirm(values);
      if (!res.ok) setError(res.error);
    });

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      size="lg"
      dismissOnOverlay={false}
      footer={
        <>
          {extraAction ? (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto"
              disabled={busy}
              onClick={() =>
                startTransition(async () => {
                  const res = await extraAction.run();
                  if (!res.ok) setError(res.error);
                })
              }
            >
              {extraAction.label}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="button" onClick={confirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert>{error}</Alert> : null}
        {note ? <p className="text-sm text-muted">{note}</p> : null}
        {diff.length === 0 ? (
          <Alert kind="info">Bilgiler aynı; farklı alan yok.</Alert>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-xs font-medium text-muted">
                <tr>
                  <th className="px-3 py-2">Alan</th>
                  <th className="px-3 py-2">{left.label}</th>
                  <th className="px-3 py-2">{right.label}</th>
                </tr>
              </thead>
              <tbody>
                {diff.map((f) => (
                  <tr key={f} className="border-t border-line align-top">
                    <td className="px-3 py-2 font-semibold text-ink">{LABELS[f]}</td>
                    {(["left", "right"] as const).map((side) => {
                      const v = (side === "left" ? left : right).values[f];
                      const on = pick[f] === side;
                      return (
                        <td key={side} className="px-2 py-1.5">
                          <label className={["flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border-2 px-2.5 py-2", on ? "border-gs-red bg-gs-red-soft" : "border-transparent hover:bg-surface"].join(" ")}>
                            <input type="radio" name={f} className="mt-0.5 h-4 w-4 accent-[var(--color-gs-red)]" checked={on} onChange={() => setPick((p) => ({ ...p, [f]: side }))} />
                            <span className={v ? "break-words text-ink" : "text-stone-500"}>{v || "boş"}</span>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

const STAGE: Record<string, number> = { enrolled: 5, left: 4, scheduled: 3, no_show: 2, pending: 1, cancelled: 0 };

export function RegistrationCompare({
  compare,
  byId,
  onClose,
  onDone,
}: {
  compare: { kind: "submission"; id: number } | { kind: "merge"; id: number; otherId: number };
  byId: Map<number, RegistrationDto>;
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const reg = byId.get(compare.id);
  const other = compare.kind === "merge" ? byId.get(compare.otherId) : undefined;
  // Birleştirmede süreçte ileride olan (eşitse eski) kayıt kalır.
  const [keepFirst, setKeepFirst] = useState(() => {
    if (!reg || !other) return true;
    const a = STAGE[reg.status] ?? 0;
    const b = STAGE[other.status] ?? 0;
    return a !== b ? a > b : reg.createdAt <= other.createdAt;
  });
  if (!reg) return null;
  if (compare.kind === "submission") {
    const sub = reg.submission;
    if (!sub) return null;
    return (
      <CompareDialog
        title={`Güncel bilgi · ${reg.studentFullName}`}
        left={{ label: "Kayıttaki", values: registrationToFormValues(reg) }}
        right={{ label: "Veliden gelen", values: sub.values }}
        preferRight
        confirmLabel="Seçilenleri uygula"
        note="Aynı T.C. ile form yeniden dolduruldu. Farklı alanlarda hangi değerin kalacağını seçin."
        onConfirm={async (values) => {
          const res = await applySubmissionAction(sub.id, values);
          if (res.ok) onDone("Güncel bilgiler uygulandı.");
          return res;
        }}
        extraAction={{
          label: "Yok say",
          run: async () => {
            const res = await dismissSubmissionAction(sub.id);
            if (res.ok) onDone("Güncelleme yok sayıldı.");
            return res;
          },
        }}
        onClose={onClose}
      />
    );
  }
  if (!other) return null;
  const keep = keepFirst ? reg : other;
  const drop = keepFirst ? other : reg;
  return (
    <CompareDialog
      key={keep.id}
      title="Kayıtları birleştir"
      left={{ label: `Kalacak: ${keep.studentFullName}`, values: registrationToFormValues(keep) }}
      right={{ label: `Silinecek: ${drop.studentFullName}`, values: registrationToFormValues(drop) }}
      preferRight={false}
      confirmLabel="Birleştir"
      note={`Kalan kaydın süreci (${STATUS_LABELS[keep.status as RegistrationStatus] ?? keep.status}), aidatı ve kartı korunur; diğer kayıt silinir, notu kalan kayda eklenir.`}
      extraAction={{ label: "Kalacak kaydı değiştir", run: async () => (setKeepFirst((v) => !v), { ok: true }) }}
      onConfirm={async (values) => {
        const res = await mergeRegistrationsAction(keep.id, drop.id, values);
        if (res.ok) onDone("Kayıtlar birleştirildi.");
        return res;
      }}
      onClose={onClose}
    />
  );
}
