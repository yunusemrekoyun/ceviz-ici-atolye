"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import type { AnnouncementView } from "@/lib/announcements";
import { BRAND_NAME } from "@/lib/constants";
import { formatDateTimeTr } from "@/lib/format";
import { createAnnouncementAction, deleteAnnouncementAction } from "./actions";

function whatsappText(a: { title: string; body: string }): string {
  return `*${a.title}*\n\n${a.body}\n\n${BRAND_NAME}`;
}

export function AnnouncementsManager({ groups, items }: { groups: { id: number; name: string }[]; items: AnnouncementView[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const copy = async (a: { title: string; body: string }) => {
    try {
      await navigator.clipboard.writeText(whatsappText(a));
      toast({ text: "Metin kopyalandı. WhatsApp grubuna yapıştırabilirsiniz." });
    } catch {
      toast({ kind: "error", text: "Kopyalanamadı." });
    }
  };

  const submit = () =>
    startTransition(async () => {
      const res = await createAnnouncementAction({ title, body, groupIds: target });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? { form: res.error });
        return;
      }
      toast({ text: `Duyuru yayınlandı (${res.notified ?? 0} veliye bildirim).` });
      setTitle("");
      setBody("");
      setTarget([]);
      setErrors({});
      router.refresh();
    });

  return (
    <div className="mt-5 grid gap-6">
      <Card title="Yeni duyuru">
        {errors.form ? <Alert>{errors.form}</Alert> : null}
        <Field label="Başlık" htmlFor="an-title" required error={errors.title}>
          <Input id="an-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} invalid={Boolean(errors.title)} />
        </Field>
        <Field label="Metin" htmlFor="an-body" required error={errors.body}>
          <Textarea id="an-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={3000} className="py-3" invalid={Boolean(errors.body)} />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">Kime</legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={target.length === 0}
              onClick={() => setTarget([])}
              className={["min-h-10 cursor-pointer rounded-full border px-3.5 text-sm font-semibold", target.length === 0 ? "border-gs-red bg-gs-red text-white" : "border-line bg-white text-ink"].join(" ")}
            >
              Tüm veliler
            </button>
            {groups.map((g) => {
              const on = target.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTarget((p) => (on ? p.filter((x) => x !== g.id) : [...p, g.id]))}
                  className={["min-h-10 cursor-pointer rounded-full border px-3.5 text-sm font-semibold", on ? "border-gs-red bg-gs-red text-white" : "border-line bg-white text-ink"].join(" ")}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={submit} loading={busy} className="min-h-12">
            Yayınla
          </Button>
          <Button type="button" variant="secondary" className="min-h-12" disabled={!title || !body} onClick={() => copy({ title, body })}>
            WhatsApp metnini kopyala
          </Button>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Geçmiş duyurular</h2>
        {items.length === 0 ? <p className="text-muted">Henüz duyuru yok.</p> : null}
        <ul className="grid gap-3">
          {items.map((a) => (
            <li key={a.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <p className="font-bold text-ink">{a.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-[15px] text-ink">{a.body}</p>
              <p className="mt-2 text-xs text-muted">
                {formatDateTimeTr(a.createdAt)} · {a.groupNames.length ? a.groupNames.join(", ") : "Tüm veliler"}
                {a.kind === "cancel" ? " · program değişikliği" : ""}
              </p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="cursor-pointer rounded-lg px-2 py-1 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" onClick={() => copy(a)}>
                  WhatsApp metni
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-lg px-2 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
                  onClick={() =>
                    startTransition(async () => {
                      const res = await deleteAnnouncementAction(a.id);
                      toast(res.ok ? { text: "Silindi." } : { kind: "error", text: res.error });
                      router.refresh();
                    })
                  }
                >
                  Sil
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
