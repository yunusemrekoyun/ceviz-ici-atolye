"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/Modal";
import { Button, Field, Input } from "@/components/ui";
import type { GuardianRow } from "@/lib/guardians";
import { formatDateTimeTr } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { normalizeForSearch } from "@/lib/search";
import { useRememberList, useUrlFilters } from "@/lib/use-url-filters";
import { whatsappLink } from "@/lib/whatsapp";
import { bulkCreateGuardiansAction, inviteGuardianAction, setGuardianStatusAction, unlinkGuardianAction, updateGuardianEmailAction } from "./actions";

type Filter = "all" | "none" | "invited" | "active";
const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Giriş yapabiliyor", cls: "bg-emerald-100 text-emerald-800" },
  invited: { label: "Davet bekliyor", cls: "bg-amber-100 text-amber-800" },
  disabled: { label: "Pasif", cls: "bg-gray-200 text-gray-700" },
};

export function GuardiansManager({ rows, groups }: { rows: GuardianRow[]; groups: Record<number, string> }) {
  useRememberList();
  const { values: u, set } = useUrlFilters({ q: "", durum: "all" }, { typed: ["q"], valid: { durum: (v) => ["all", "none", "invited", "active"].includes(v) } });
  const query = u.q;
  const setQuery = (v: string) => set({ q: v });
  const filter = u.durum as Filter;
  const setFilter = (v: Filter) => set({ durum: v });
  const [invite, setInvite] = useState<{ name: string; link: string; message: string; phone: string | null } | null>(null);
  const [edit, setEdit] = useState<GuardianRow | null>(null);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const counts = useMemo(() => {
    const c = { all: rows.length, none: 0, invited: 0, active: 0 };
    for (const r of rows) {
      const s = r.guardian?.status;
      if (!s) c.none++;
      else if (s === "active") c.active++;
      else if (s === "invited") c.invited++;
    }
    return c;
  }, [rows]);

  const visible = rows.filter((r) => {
    const q = normalizeForSearch(query);
    const matches = !q || normalizeForSearch(`${r.studentName} ${r.contactName}`).includes(q) || String(r.studentNo ?? "") === query.trim();
    const st = r.guardian?.status ?? "none";
    return matches && (filter === "all" || st === filter);
  });

  const sendInvite = (r: GuardianRow) =>
    startTransition(async () => {
      const res = await inviteGuardianAction(r.registrationId);
      if (!res.ok || !res.link) return toast({ kind: "error", text: res.ok ? "Bağlantı üretilemedi." : res.error });
      setInvite({ name: r.contactName || r.studentName, link: res.link, message: res.message ?? res.link, phone: res.phone ?? (r.contactPhone || null) });
      router.refresh();
    });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ text: "Kopyalandı." });
    } catch {
      toast({ kind: "error", text: "Kopyalanamadı." });
    }
  };

  return (
    <div className="mt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input type="search" placeholder="Öğrenci ya da veli adı" value={query} onChange={(e) => setQuery(e.target.value)} className="sm:max-w-xs" aria-label="Ara" />
        <div className="flex gap-1.5 overflow-x-auto">
          {(
            [
              ["all", "Tümü"],
              ["none", "Hesabı yok"],
              ["invited", "Davet bekliyor"],
              ["active", "Aktif"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={["min-h-10 shrink-0 cursor-pointer rounded-full border px-3.5 text-sm font-semibold transition", filter === k ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-gray-400"].join(" ")}
            >
              {label} <span className="opacity-70">{counts[k]}</span>
            </button>
          ))}
        </div>
        {counts.none > 0 ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 sm:ml-auto"
            disabled={busy}
            onClick={() =>
              startTransition(async () => {
                const res = await bulkCreateGuardiansAction();
                toast(res.ok ? { text: `${res.created ?? 0} veli hesabı açıldı. Davetleri tek tek gönderebilirsiniz.` } : { kind: "error", text: res.error });
                router.refresh();
              })
            }
          >
            Hesabı olmayanlara aç ({counts.none})
          </Button>
        ) : null}
      </div>

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {visible.map((r) => {
          const st = r.guardian ? STATUS[r.guardian.status] : null;
          return (
            <li key={r.registrationId} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-ink">{r.studentName}</p>
                  <p className="text-sm text-muted">
                    No {r.studentNo ?? "—"} · {r.groupId ? (groups[r.groupId] ?? "") : "Grupsuz"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${st?.cls ?? "bg-gray-100 text-gray-700"}`}>{st?.label ?? "Hesap yok"}</span>
              </div>
              <p className="mt-2 text-sm text-ink">
                Veli: {r.guardian?.name ?? r.contactName ?? "—"}
                {r.guardian?.phone || r.contactPhone ? ` · ${formatPhone(r.guardian?.phone ?? r.contactPhone)}` : ""}
                {r.guardian?.email ? ` · ${r.guardian.email}` : ""}
              </p>
              {r.guardian ? (
                <p className="text-xs text-muted">
                  {r.guardian.children > 1 ? `${r.guardian.children} çocuk bu hesapta · ` : ""}Son giriş: {r.guardian.lastLoginAt ? formatDateTimeTr(r.guardian.lastLoginAt) : "hiç"}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" className="flex-1" disabled={busy || r.guardian?.status === "disabled"} onClick={() => sendInvite(r)}>
                  {r.guardian?.status === "active" ? "Şifre yenileme bağlantısı" : "Davet gönder"}
                </Button>
                {r.guardian ? (
                  <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" onClick={() => setEdit(r)}>
                    Hesap
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 ? <p className="mt-8 text-center text-muted">Kayıt yok.</p> : null}

      <Modal open={Boolean(invite)} title="Bağlantı hazır" onClose={() => setInvite(null)}>
        {invite ? (
          <div className="grid gap-3">
            <p className="text-sm text-ink">Bu bağlantı tek kullanımlıktır ve 7 gün geçerlidir. Yenisini üretirseniz eskisi çalışmaz.</p>
            <p className="break-all rounded-xl bg-surface p-3 font-mono text-xs text-ink">{invite.link}</p>
            <div className="flex flex-wrap gap-2">
              {invite.phone ? (
                <a href={whatsappLink(invite.phone, invite.message)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800">
                  WhatsApp ile gönder
                </a>
              ) : null}
              <Button type="button" variant="secondary" className="min-h-12 flex-1" onClick={() => copy(invite.message)}>
                Mesajı kopyala
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {edit?.guardian ? <AccountDialog row={edit} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}

function AccountDialog({ row, onClose }: { row: GuardianRow; onClose: () => void }) {
  const g = row.guardian!;
  const [email, setEmail] = useState(g.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string, close = true) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "Hata");
      toast({ text: ok });
      router.refresh();
      if (close) onClose();
    });
  return (
    <Modal open title={`Veli hesabı · ${g.name ?? row.contactName}`} onClose={onClose}>
      <div className="grid gap-4">
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}
        <Field label="E-posta (şifremi unuttum için)" htmlFor="g-email">
          <div className="flex gap-2">
            <Input id="g-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="button" variant="secondary" className="min-h-12 shrink-0" loading={busy} onClick={() => act(() => updateGuardianEmailAction(g.id, email), "E-posta kaydedildi.", false)}>
              Kaydet
            </Button>
          </div>
        </Field>
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" className="min-h-11" disabled={busy} onClick={() => act(() => setGuardianStatusAction(g.id, g.status === "disabled"), g.status === "disabled" ? "Etkinleştirildi." : "Pasifleştirildi; açık oturumları kapandı.")}>
            {g.status === "disabled" ? "Hesabı etkinleştir" : "Hesabı pasifleştir"}
          </Button>
          <Button type="button" variant="ghost" className="min-h-11 text-red-700 hover:bg-red-50" disabled={busy} onClick={() => act(() => unlinkGuardianAction(g.id, row.registrationId), "Bu öğrenci hesaptan ayrıldı.")}>
            {row.studentName} bağlantısını kaldır
          </Button>
        </div>
      </div>
    </Modal>
  );
}
