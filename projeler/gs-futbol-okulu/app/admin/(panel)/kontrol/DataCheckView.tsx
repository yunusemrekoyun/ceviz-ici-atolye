"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, CircleCheck, GitMerge } from "lucide-react";
import { Avatar, EmptyState, FilterTabs, Page, PageHeader, Panel } from "@/components/admin/kit";
import { useToast } from "@/components/admin/Toast";
import { Button } from "@/components/ui";
import type { RegistrationDto } from "@/lib/api";
import { useRememberList, useUrlFilters } from "@/lib/use-url-filters";
import { fixHref, ISSUE_TYPES, issuesOf, type Issue, type IssueType } from "@/lib/data-issues";
import { STATUS_BADGE, STATUS_LABELS, isRegistrationStatus, type RegistrationStatus } from "@/lib/registration-status";
import { notDuplicateAction } from "../actions";
import { RegistrationCompare } from "../CompareDialog";

type Row = { reg: RegistrationDto; issue: Issue };
type Tab = "fix" | "missing";

/** Sırası: önce bozuk bilgiler, sonra tekrarlar ve veliden gelenler; eksik bilgi ayrı sekmede. */
const ORDER: IssueType[] = ["tc", "phone", "noPhone", "birth", "group", "duplicate", "submission", "email"];

const FIX_LABEL: Partial<Record<IssueType, string>> = { tc: "Düzelt", phone: "Düzelt", noPhone: "Telefonu gir", birth: "Düzelt", group: "Grup ata", email: "Düzelt" };

/**
 * Veri kontrolü: hatalı ya da şüpheli bilgiler türüne göre; her satırda tek tıkla düzeltme
 * (ilgili alan açılır), olası tekrarlarda karşılaştır-birleştir.
 */
export function DataCheckView({ registrations, canEdit }: { registrations: RegistrationDto[]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  useRememberList();
  const { values: u, set } = useUrlFilters({ sekme: "fix" }, { valid: { sekme: (v) => v === "fix" || v === "missing" } });
  const tab = u.sekme as Tab;
  const setTab = (v: Tab) => set({ sekme: v });
  const [compare, setCompare] = useState<{ kind: "submission"; id: number } | { kind: "merge"; id: number; otherId: number } | null>(null);
  const [busy, startTransition] = useTransition();
  const byId = useMemo(() => new Map(registrations.map((r) => [r.id, r])), [registrations]);

  const { sections, missing, fixCount } = useMemo(() => {
    const by = new Map<IssueType, Row[]>();
    const miss: Row[] = [];
    const seenPairs = new Set<string>();
    for (const reg of registrations) {
      for (const issue of issuesOf(reg, byId)) {
        if (issue.type === "missing") {
          miss.push({ reg, issue });
          continue;
        }
        if (issue.fix.kind === "merge") {
          const pair = [reg.id, issue.fix.otherId].sort().join("-");
          if (seenPairs.has(pair)) continue;
          seenPairs.add(pair);
        }
        by.set(issue.type, [...(by.get(issue.type) ?? []), { reg, issue }]);
      }
    }
    const order: Record<string, number> = { enrolled: 0, scheduled: 1, pending: 2, no_show: 3, left: 4, cancelled: 5 };
    miss.sort((a, b) => (order[a.reg.status] ?? 9) - (order[b.reg.status] ?? 9) || a.reg.studentFullName.localeCompare(b.reg.studentFullName, "tr"));
    const secs = ORDER.filter((t) => by.has(t)).map((t) => ({ type: t, rows: by.get(t)! }));
    return { sections: secs, missing: miss, fixCount: secs.reduce((n, s) => n + s.rows.length, 0) };
  }, [registrations, byId]);

  const pill = (status: string) => (
    <span className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold ${isRegistrationStatus(status) ? STATUS_BADGE[status] : ""}`}>{STATUS_LABELS[status as RegistrationStatus] ?? status}</span>
  );

  const actionFor = ({ reg, issue }: Row) => {
    if (!canEdit) return null;
    const href = fixHref(reg.id, issue.fix);
    if (href)
      return (
        <Link href={href} className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-gs-red px-3 text-sm font-semibold text-white transition hover:bg-gs-red-dark active:scale-[0.97] pointer-coarse:min-h-11">
          {FIX_LABEL[issue.type] ?? "Tamamla"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      );
    if (issue.fix.kind === "merge") {
      const otherId = issue.fix.otherId;
      return (
        <>
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => startTransition(async () => {
            const res = await notDuplicateAction(reg.id, otherId);
            toast(res.ok ? { text: "Farklı kişiler olarak işaretlendi." } : { kind: "error", text: res.error });
            if (res.ok) router.refresh();
          })}>
            Farklı kişiler
          </Button>
          <Button type="button" size="sm" onClick={() => setCompare({ kind: "merge", id: reg.id, otherId })}>
            <GitMerge className="h-4 w-4" aria-hidden="true" /> Karşılaştır
          </Button>
        </>
      );
    }
    if (issue.fix.kind === "submission")
      return (
        <Button type="button" size="sm" onClick={() => setCompare({ kind: "submission", id: reg.id })}>
          Karşılaştır
        </Button>
      );
    return null;
  };

  const renderRow = (row: Row) => {
    const { reg, issue } = row;
    const other = issue.fix.kind === "merge" ? byId.get(issue.fix.otherId) : null;
    return (
      <li key={`${reg.id}-${issue.key}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
        <Link href={`/admin/kayit/${reg.id}`} className="group flex min-w-0 flex-1 basis-60 items-center gap-3">
          <Avatar name={reg.studentFullName} photoId={reg.photoFileId} />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate text-[15px] font-semibold text-ink group-hover:text-gs-red">{reg.studentFullName}</span>
              {pill(reg.status)}
              {reg.studentNo ? <span className="text-xs tabular-nums text-muted">No {reg.studentNo}</span> : null}
            </span>
            {other ? (
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                ile aynı kişi olabilir: <span className="font-semibold text-ink">{other.studentFullName}</span> {pill(other.status)}
              </span>
            ) : (
              <span className="mt-0.5 block text-sm text-muted">
                {issue.label}
                {issue.detail ? (
                  <>
                    {" · "}
                    <span className={issue.type === "tc" || issue.type === "phone" ? "font-mono font-semibold text-red-700" : "text-ink"}>{issue.detail}</span>
                  </>
                ) : null}
              </span>
            )}
          </span>
        </Link>
        <span className="flex w-full items-center justify-end gap-2 sm:w-auto">{actionFor(row)}</span>
      </li>
    );
  };

  return (
    <Page>
      <PageHeader title="Veri kontrolü" description="Bozuk ya da şüpheli veriler. Kayıtları durdurmaz; “Düzelt”e dokununca ilgili alan açılır, düzeltip kaydedince buradan kalkar." />
      <div className="mb-4 border-b border-line pb-2">
        <FilterTabs<Tab>
          value={tab}
          onChange={setTab}
          label="Bölümler"
          options={[
            { value: "fix", label: "Düzeltilecekler", count: fixCount },
            { value: "missing", label: "Eksik bilgi", count: missing.length },
          ]}
        />
      </div>

      {tab === "fix" ? (
        sections.length === 0 ? (
          <Panel>
            <EmptyState icon={<CircleCheck />} title="Bozuk veri yok">Geçersiz T.C./telefon, şüpheli doğum tarihi, grubu olmayan öğrenci ya da olası tekrar kayıt çıkınca burada listelenir.</EmptyState>
          </Panel>
        ) : (
          <div className="grid gap-5">
            {sections.map((s) => (
              <Panel key={s.type} title={`${ISSUE_TYPES[s.type]} (${s.rows.length})`} description={HINT[s.type]} flush>
                <ul className="divide-y divide-line border-t border-line">{s.rows.map(renderRow)}</ul>
              </Panel>
            ))}
          </div>
        )
      ) : missing.length === 0 ? (
        <Panel>
          <EmptyState icon={<CircleCheck />} title="Eksik bilgisi olan kayıt yok" />
        </Panel>
      ) : (
        <Panel title={`Eksik bilgi (${missing.length})`} description="Önce kayıtlı öğrenciler. “Tamamla” ilk eksik alanı açar." flush>
          <ul className="divide-y divide-line border-t border-line">{missing.map(renderRow)}</ul>
        </Panel>
      )}

      {compare ? (
        <RegistrationCompare
          compare={compare}
          byId={byId}
          onClose={() => setCompare(null)}
          onDone={(text) => {
            setCompare(null);
            toast({ text });
            router.refresh();
          }}
        />
      ) : null}
    </Page>
  );
}

const HINT: Partial<Record<IssueType, string>> = {
  tc: "Rakam sayısı ya da doğrulama tutmuyor; çoğu zaman tek rakam yanlış yazılmıştır.",
  phone: "Cep telefonu biçiminde değil (05xx xxx xx xx).",
  noPhone: "Veliye ulaşmak için iletişim velisinin telefonu gerekli.",
  birth: "3–18 yaş dışında; yıl yanlış yazılmış olabilir.",
  group: "Yoklama ve programda görünmesi için grubu atanmalı.",
  duplicate: "Aynı telefon ve benzer ad. Karşılaştırıp tek kayda indirin ya da farklı kişiler deyin.",
  submission: "Veli formu yeniden doldurdu; farkları görüp uygulayın.",
  email: "E-posta biçimi hatalı.",
};
