"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatYearRange, type AgeGroupView } from "@/lib/age-groups";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/admin/Toast";
import { Alert, Button, Select } from "@/components/ui";
import { deleteAgeGroupAction } from "../actions";
import { GroupEditDialog } from "./GroupEditDialog";

type Stats = Record<number, { students: number; keepers: number; candidates: number }>;
type Props = {
  groups: AgeGroupView[];
  stats: Stats;
  uncovered: { year: number; count: number }[];
  /** Grup kimliği → kısa program ("Cumartesi, Pazar 10:00"). */
  schedule: Record<number, string>;
};

export function GroupsManager({ groups, stats, uncovered, schedule }: Props) {
  const [editing, setEditing] = useState<AgeGroupView | "new" | null>(null);
  const [deleting, setDeleting] = useState<AgeGroupView | null>(null);
  const toast = useToast();

  return (
    <div className="mt-6 grid gap-4">

      {uncovered.length > 0 ? (
        <Alert kind="info">
          Bu doğum yıllarında kayıt var ama hiçbir gruba düşmüyor:{" "}
          <span className="font-semibold">{uncovered.map((u) => `${u.year} (${u.count} kişi)`).join(", ")}</span>
        </Alert>
      ) : null}

      <ul className="grid gap-3">
        {groups.map((g) => (
          <li key={g.id} className="group relative flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md">
            <div className="min-w-0 flex-1">
              {/* Kartın tamamı grup sayfasını açar; düğmeler üstte kalır */}
              <Link href={`/admin/gruplar/${g.id}`} className="text-lg font-bold text-ink after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover:text-gs-red">
                {g.name}
              </Link>
              <p className="text-sm text-muted">
                Doğum yılı {formatYearRange(g)}
                {schedule[g.id] ? ` · ${schedule[g.id]}` : " · program girilmedi"}
              </p>
            </div>
            <div className="flex gap-5 text-center text-sm">
              <div>
                <p className="text-xl font-bold tabular-nums text-emerald-700">{stats[g.id]?.students ?? 0}</p>
                <p className="text-xs text-muted">Öğrenci</p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-ink">{stats[g.id]?.keepers ?? 0}</p>
                <p className="text-xs text-muted">Kaleci</p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-amber-600">{stats[g.id]?.candidates ?? 0}</p>
                <p className="text-xs text-muted">Aday</p>
              </div>
            </div>
            <div className="relative z-[1] flex items-center gap-2">
              <Button type="button" variant="secondary" className="min-h-10" onClick={() => setEditing(g)}>
                Düzenle
              </Button>
              <Button type="button" variant="ghost" className="min-h-10" onClick={() => setDeleting(g)}>
                Sil
              </Button>
              <ChevronRight className="hidden h-5 w-5 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-muted sm:block" aria-hidden="true" />
            </div>
          </li>
        ))}
      </ul>

      <Button type="button" variant="secondary" className="justify-self-start" onClick={() => setEditing("new")}>
        + Yeni Grup
      </Button>

      {editing ? (
        <GroupEditDialog
          group={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            toast({ text });
          }}
        />
      ) : null}

      {deleting ? (
        <DeleteGroupDialog
          group={deleting}
          others={groups.filter((g) => g.id !== deleting.id)}
          studentCount={stats[deleting.id]?.students ?? 0}
          onClose={() => setDeleting(null)}
          onDone={(text) => {
            setDeleting(null);
            toast({ text });
          }}
        />
      ) : null}
    </div>
  );
}

function DeleteGroupDialog({
  group,
  others,
  studentCount,
  onClose,
  onDone,
}: {
  group: AgeGroupView;
  others: AgeGroupView[];
  studentCount: number;
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const [moveTo, setMoveTo] = useState(others[0] ? String(others[0].id) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const target = studentCount > 0 && moveTo ? Number(moveTo) : null;
      const res = await deleteAgeGroupAction(group.id, target);
      if (!res.ok) return setError(res.error);
      const targetName = others.find((g) => g.id === target)?.name;
      onDone(targetName ? `${group.name} silindi, öğrencileri ${targetName} grubuna taşındı.` : `${group.name} silindi.`);
    });
  }

  return (
    <Modal
      open
      title={`${group.name} grubunu sil`}
      onClose={onClose}
      closeDisabled={pending}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Vazgeç
          </Button>
          <Button type="button" variant="danger" onClick={submit} loading={pending}>
            Sil
          </Button>
        </>
      }
    >
      <div className="grid gap-4 text-[15px]">
        {error ? <Alert>{error}</Alert> : null}
        {studentCount > 0 ? (
          <>
            <p>
              Bu grupta <span className="font-semibold">{studentCount} öğrenci</span> var. Silmeden önce öğrencilerin taşınacağı grubu seçin:
            </p>
            <Select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} aria-label="Taşınacak grup">
              {others.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({formatYearRange(g)})
                </option>
              ))}
              <option value="">Grupsuz bırak</option>
            </Select>
            <p className="text-sm text-muted">
              İki grubu birleştirmek için silmeniz gerekmez: kalacak grubun Düzenle&apos;sinden yıllarını ikisini de kapsayacak şekilde genişletin.
            </p>
          </>
        ) : (
          <p>Bu grupta öğrenci yok. Grup silinecek; bu doğum yıllarındaki adaylar grup dışı görünecek.</p>
        )}
        <p className="text-sm text-muted">Grubun geçmiş antrenmanları ve yoklamaları silinmez; programı ve sıradaki antrenmanları kalkar.</p>
      </div>
    </Modal>
  );
}
