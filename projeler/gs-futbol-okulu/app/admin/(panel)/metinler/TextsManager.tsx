"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { Markdown } from "@/components/Markdown";
import { Modal } from "@/components/Modal";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { formatDateTimeTr } from "@/lib/format";
import type { LegalTextSummary } from "@/lib/legal";
import { CONSENT_TYPE_LABELS, CONSENT_TYPES, type ConsentType } from "@/lib/legal-shared";
import { createTextAction, discardDraftAction, publishDraftAction, saveDraftAction, updateTextMetaAction, type TextMetaValues } from "./actions";

type Props = { texts: LegalTextSummary[]; bodies: Record<number, string> };

const TYPE_STYLE: Record<ConsentType, string> = {
  required: "bg-gs-red-soft text-gs-red",
  optional: "bg-amber-100 text-amber-800",
  info: "bg-sky-100 text-sky-800",
};

export function TextsManager({ texts, bodies }: Props) {
  const [selectedKey, setSelectedKey] = useState(texts[0]?.key ?? null);
  const [metaFor, setMetaFor] = useState<LegalTextSummary | "new" | null>(null);
  const selected = texts.find((t) => t.key === selectedKey) ?? texts[0] ?? null;

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr]">
      <aside>
        <ul className="grid gap-2">
          {texts.map((t) => (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => setSelectedKey(t.key)}
                aria-current={selected?.key === t.key}
                className={[
                  "w-full cursor-pointer rounded-2xl border bg-white p-3 text-left shadow-sm transition hover:shadow-md",
                  selected?.key === t.key ? "border-gs-red ring-2 ring-gs-red/15" : "border-line",
                ].join(" ")}
              >
                <p className="font-semibold text-ink">{t.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={`rounded-md px-1.5 py-0.5 font-bold ${TYPE_STYLE[t.consentType as ConsentType] ?? ""}`}>{CONSENT_TYPE_LABELS[t.consentType as ConsentType]}</span>
                  <span className="text-muted">{t.published ? `Sürüm ${t.published.version}` : "Yayında değil"}</span>
                  {t.draft ? <span className="rounded-md bg-gray-200 px-1.5 py-0.5 font-bold text-gray-700">Taslak var</span> : null}
                </p>
                {t.consentType !== "info" && t.published ? (
                  <p className="mt-1 text-xs text-muted">
                    Bu sürüm: {t.acceptedCount} onay{t.declinedCount ? ` · ${t.declinedCount} ret` : ""}
                  </p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="secondary" fullWidth className="mt-3 min-h-11" onClick={() => setMetaFor("new")}>
          + Yeni metin
        </Button>
      </aside>

      {selected ? <Editor key={`${selected.key}-${selected.draft?.id ?? 0}-${selected.published?.id ?? 0}`} text={selected} bodies={bodies} onEditMeta={() => setMetaFor(selected)} /> : null}

      {metaFor ? <MetaDialog text={metaFor === "new" ? null : metaFor} onClose={() => setMetaFor(null)} onCreated={(k) => setSelectedKey(k)} /> : null}
    </div>
  );
}

function Editor({ text, bodies, onEditMeta }: { text: LegalTextSummary; bodies: Record<number, string>; onEditMeta: () => void }) {
  const initial = text.draft?.body ?? text.published?.body ?? "";
  const [body, setBody] = useState(initial);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [viewVersion, setViewVersion] = useState<number | null>(null);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const dirty = body !== initial;

  const save = () =>
    startTransition(async () => {
      const res = await saveDraftAction(text.key, body);
      toast(res.ok ? { text: "Taslak kaydedildi." } : { kind: "error", text: res.error });
      if (res.ok) router.refresh();
    });

  const publish = () =>
    startTransition(async () => {
      if (dirty || !text.draft) {
        const saved = await saveDraftAction(text.key, body);
        if (!saved.ok) return toast({ kind: "error", text: saved.error });
      }
      const res = await publishDraftAction(text.key);
      setConfirmPublish(false);
      toast(res.ok ? { text: "Yeni sürüm yayınlandı." } : { kind: "error", text: res.error });
      router.refresh();
    });

  const discard = () =>
    startTransition(async () => {
      const res = await discardDraftAction(text.key);
      toast(res.ok ? { text: "Taslak silindi." } : { kind: "error", text: res.error });
      router.refresh();
    });

  const viewed = viewVersion ? text.versions.find((v) => v.id === viewVersion) : null;

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-ink">{text.title}</h2>
          {text.description ? <p className="mt-0.5 text-sm text-muted">{text.description}</p> : null}
          <p className="mt-1 text-xs text-muted">
            Herkese açık adres:{" "}
            <a href={`/metin/${text.key}`} target="_blank" rel="noopener" className="font-mono text-gs-red hover:underline">
              /metin/{text.key}
            </a>
          </p>
        </div>
        <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" onClick={onEditMeta}>
          Bilgileri düzenle
        </Button>
      </div>

      {text.draft ? (
        <div className="mt-3">
          <Alert kind="info">Taslak kayıtlı (sürüm {text.draft.version}). Yayınlanana kadar veliler yayındaki sürümü görür.</Alert>
        </div>
      ) : null}

      <div className="mt-4 flex gap-1 rounded-xl bg-surface p-1" role="tablist">
        {(
          [
            ["edit", "Düzenle"],
            ["preview", "Önizleme"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={["min-h-10 flex-1 cursor-pointer rounded-lg px-4 text-sm font-semibold transition", tab === k ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "edit" ? (
        <div className="mt-3">
          <Textarea id="legal-body" value={body} onChange={(e) => setBody(e.target.value)} rows={18} className="py-3 font-mono text-sm leading-6" />
          <p className="mt-1.5 text-xs text-muted">Biçim: satır başında “## ” başlık, “- ” madde; **iki yıldız** arası kalın. Boş satır yeni paragraf.</p>
        </div>
      ) : (
        <div className="mt-3 max-h-[60vh] overflow-y-auto rounded-xl border border-line p-4 text-[15px] text-ink">
          <Markdown source={body} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" className="min-h-11" onClick={() => setConfirmPublish(true)} disabled={busy || !body.trim()}>
          Yayınla
        </Button>
        <Button type="button" variant="secondary" className="min-h-11" onClick={save} loading={busy} disabled={!dirty}>
          Taslak kaydet
        </Button>
        {text.draft ? (
          <Button type="button" variant="ghost" className="min-h-11 text-red-700 hover:bg-red-50" onClick={discard} disabled={busy}>
            Taslağı sil
          </Button>
        ) : null}
        {dirty ? <span className="self-center text-sm text-amber-700">Kaydedilmemiş değişiklik var</span> : null}
      </div>

      <h3 className="mt-6 border-b border-line pb-1 text-[15px] font-semibold text-ink">Sürüm geçmişi</h3>
      <ul className="mt-2 divide-y divide-line/70">
        {text.versions.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
            <span className="font-semibold text-ink">Sürüm {v.version}</span>
            <span className={v.status === "published" ? "text-emerald-700" : "text-gray-600"}>{v.status === "published" ? "Yayınlandı" : "Taslak"}</span>
            <span className="text-muted">{formatDateTimeTr(v.publishedAt ?? v.createdAt)}</span>
            <button type="button" className="ml-auto cursor-pointer rounded-lg px-2 py-1 font-semibold text-gs-red hover:bg-gs-red-soft" onClick={() => setViewVersion(v.id)}>
              Görüntüle
            </button>
          </li>
        ))}
      </ul>

      <Modal
        open={confirmPublish}
        title="Yeni sürüm yayınlansın mı?"
        onClose={() => setConfirmPublish(false)}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmPublish(false)} disabled={busy}>
              Vazgeç
            </Button>
            <Button type="button" onClick={publish} loading={busy}>
              Yayınla
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">Yayınlanan sürüm bir daha değiştirilemez; sonraki düzeltmeler yeni sürüm olur.</p>
        {text.consentType === "required" ? <p className="mt-2 text-sm text-ink">Bu metin onay gerektiriyor: veliler panele bir sonraki girişlerinde yeni sürümü onaylamadan devam edemez.</p> : null}
      </Modal>

      <Modal open={Boolean(viewed)} title={viewed ? `${text.title} · Sürüm ${viewed.version}` : ""} onClose={() => setViewVersion(null)} size="lg">
        {viewed ? <Markdown source={bodies[viewed.id] ?? ""} className="text-[15px] text-ink" /> : null}
      </Modal>
    </section>
  );
}

function MetaDialog({ text, onClose, onCreated }: { text: LegalTextSummary | null; onClose: () => void; onCreated: (key: string) => void }) {
  const [values, setValues] = useState<TextMetaValues>({
    key: text?.key ?? "",
    title: text?.title ?? "",
    description: text?.description ?? "",
    consentType: text?.consentType ?? "required",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const set = (k: keyof TextMetaValues, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const submit = () =>
    startTransition(async () => {
      const res = text ? await updateTextMetaAction(text.key, values) : await createTextAction(values);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? { form: res.error });
        return;
      }
      toast({ text: text ? "Kaydedildi." : "Metin eklendi. Şimdi içeriğini yazıp yayınlayın." });
      if (!text && values.key) onCreated(values.key);
      onClose();
      router.refresh();
    });

  return (
    <Modal
      open
      title={text ? "Metin bilgileri" : "Yeni metin"}
      onClose={onClose}
      dismissOnOverlay={false}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="button" onClick={submit} loading={busy}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {errors.form ? <Alert>{errors.form}</Alert> : null}
        <Field label="Başlık" htmlFor="meta-title" required error={errors.title}>
          <Input id="meta-title" value={values.title} onChange={(e) => set("title", e.target.value)} invalid={Boolean(errors.title)} />
        </Field>
        {!text ? (
          <Field label="Kısa ad (adreste görünür)" htmlFor="meta-key" required error={errors.key} hint="Örn. kamp-izni — küçük harf, rakam ve tire.">
            <Input id="meta-key" value={values.key} onChange={(e) => set("key", e.target.value.toLowerCase())} invalid={Boolean(errors.key)} className="font-mono" />
          </Field>
        ) : null}
        <Field label="Kısa açıklama" htmlFor="meta-desc" error={errors.description}>
          <Input id="meta-desc" value={values.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Tür" htmlFor="meta-type" hint="Onay zorunlu: veli onaylamadan panele devam edemez. İsteğe bağlı: kabul veya ret seçer.">
          <Select id="meta-type" value={values.consentType} onChange={(e) => set("consentType", e.target.value)}>
            {CONSENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONSENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
