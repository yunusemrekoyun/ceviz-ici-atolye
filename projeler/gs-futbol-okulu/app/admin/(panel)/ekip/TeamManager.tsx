"use client";

import { useState, useTransition } from "react";
import type { Role } from "@/lib/db/schema";
import { formatDateTimeTr } from "@/lib/format";
import { formatPhone, maskPhoneInput } from "@/lib/phone";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/Modal";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import type { ActionResult } from "@/lib/admin-action";
import { deleteRoleAction, revokeStaffSessionsAction, saveRoleAction, saveStaffAction, setStaffStatusAction, type RoleFormValues, type StaffFormValues } from "./actions";

type StaffRow = {
  id: number;
  fullName: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  roleName: string;
  portal: string;
  status: string;
  lastLoginAt: string | null;
  hasPassword: boolean;
};
type PermissionDef = { key: string; group: string; label: string };
type Props = { meId: number; staff: StaffRow[]; roles: Role[]; counts: Record<string, number>; permissions: PermissionDef[] };

const PORTAL_LABEL: Record<string, string> = { admin: "Yönetim paneli", coach: "Antrenör paneli" };

function randomPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function TeamManager({ meId, staff, roles, counts, permissions }: Props) {
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [editUser, setEditUser] = useState<StaffRow | "new" | null>(null);
  const [editRole, setEditRole] = useState<Role | "new" | null>(null);
  const toast = useToast();
  const [busy, startTransition] = useTransition();

  const act = (fn: () => Promise<ActionResult>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      toast(res.ok ? { text: ok } : { kind: "error", text: res.error });
    });

  return (
    <div className="mt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-surface p-1" role="tablist">
          {(
            [
              ["users", `Kullanıcılar (${staff.length})`],
              ["roles", `Roller (${roles.length})`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={["min-h-10 cursor-pointer rounded-lg px-4 text-sm font-semibold transition", tab === k ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
        <Button type="button" className="min-h-11" onClick={() => (tab === "users" ? setEditUser("new") : setEditRole("new"))}>
          + {tab === "users" ? "Kullanıcı Ekle" : "Rol Ekle"}
        </Button>
      </div>

      {tab === "users" ? (
        <ul className="grid gap-3">
          {staff.map((u) => (
            <li key={u.id} className={["rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md", u.status === "active" ? "border-line" : "border-dashed border-gray-300 opacity-75"].join(" ")}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    {u.fullName ?? u.username}
                    {u.id === meId ? <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs text-muted">siz</span> : null}
                    <span className={["rounded-md px-2 py-0.5 text-xs font-bold", u.portal === "admin" ? "bg-gs-red-soft text-gs-red" : "bg-sky-100 text-sky-800"].join(" ")}>{u.roleName}</span>
                    {u.status !== "active" ? <span className="rounded-md bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-600">Pasif</span> : null}
                  </p>
                  <p className="mt-1 max-w-2xl text-[15px] text-muted">
                    <span className="font-mono">{u.username}</span>
                    {u.email ? ` · ${u.email}` : ""}
                    {u.phone ? ` · ${formatPhone(u.phone)}` : ""}
                  </p>
                  <p className="text-xs text-muted">Son giriş: {u.lastLoginAt ? formatDateTimeTr(u.lastLoginAt) : "hiç"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" onClick={() => setEditUser(u)}>
                    Düzenle
                  </Button>
                  <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" disabled={busy} onClick={() => act(() => revokeStaffSessionsAction(u.id), "Oturumları kapatıldı.")}>
                    Oturumları kapat
                  </Button>
                  {u.id !== meId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className={["min-h-10 px-3 text-sm", u.status === "active" ? "text-red-700 hover:bg-red-50" : ""].join(" ")}
                      disabled={busy}
                      onClick={() => act(() => setStaffStatusAction(u.id, u.status !== "active"), u.status === "active" ? "Pasifleştirildi." : "Etkinleştirildi.")}
                    >
                      {u.status === "active" ? "Pasifleştir" : "Etkinleştir"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {roles.map((r) => {
            const perms = r.key === "admin" ? permissions.length : (JSON.parse(r.permissions) as string[]).length;
            return (
              <li key={r.key} className="rounded-2xl border border-line bg-white p-4 shadow-sm transition hover:shadow-md">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  {r.name}
                  {r.isSystem ? <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs text-muted">sistem</span> : null}
                </p>
                <p className="mt-1 max-w-2xl text-[15px] text-muted">
                  {PORTAL_LABEL[r.portal]} · {perms} izin · {counts[r.key] ?? 0} kullanıcı
                </p>
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" onClick={() => setEditRole(r)}>
                    {r.key === "admin" ? "İzinleri gör" : "Düzenle"}
                  </Button>
                  {!r.isSystem ? (
                    <Button type="button" variant="ghost" className="min-h-10 px-3 text-sm text-red-700 hover:bg-red-50" disabled={busy} onClick={() => act(() => deleteRoleAction(r.key), "Rol silindi.")}>
                      Sil
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editUser ? <StaffDialog row={editUser === "new" ? null : editUser} roles={roles} onClose={() => setEditUser(null)} onDone={(t) => (setEditUser(null), toast({ text: t }))} /> : null}
      {editRole ? (
        <RoleDialog role={editRole === "new" ? null : editRole} permissions={permissions} onClose={() => setEditRole(null)} onDone={(t) => (setEditRole(null), toast({ text: t }))} />
      ) : null}
    </div>
  );
}

function StaffDialog({ row, roles, onClose, onDone }: { row: StaffRow | null; roles: Role[]; onClose: () => void; onDone: (t: string) => void }) {
  const [v, setV] = useState<StaffFormValues>({
    fullName: row?.fullName ?? "",
    username: row?.username ?? "",
    email: row?.email ?? "",
    phone: row?.phone ? formatPhone(row.phone) : "",
    role: row?.role ?? (roles.find((r) => r.key === "coach")?.key ?? roles[0]?.key ?? ""),
    password: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [res, setRes] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const err = res && !res.ok ? (res.fieldErrors ?? {}) : {};
  const set = (k: keyof StaffFormValues) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const submit = () =>
    start(async () => {
      const r = await saveStaffAction(row?.id ?? null, v);
      setRes(r);
      if (r.ok) onDone(row ? "Kullanıcı güncellendi." : `${v.fullName} eklendi. Şifreyi kendisine iletin.`);
    });
  return (
    <Modal
      open
      title={row ? `Düzenle · ${row.fullName ?? row.username}` : "Kullanıcı Ekle"}
      onClose={onClose}
      closeDisabled={pending}
      dismissOnOverlay={false}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Vazgeç
          </Button>
          <Button type="button" onClick={submit} loading={pending}>
            Kaydet
          </Button>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={(e) => (e.preventDefault(), submit())}>
        {res && !res.ok && !res.fieldErrors ? <Alert>{res.error}</Alert> : null}
        <Field label="Ad soyad" htmlFor="s-name" required error={err.fullName}>
          <Input id="s-name" value={v.fullName} onChange={set("fullName")} invalid={Boolean(err.fullName)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kullanıcı adı" htmlFor="s-user" required error={err.username} hint="Girişte kullanılır.">
            <Input id="s-user" value={v.username} onChange={set("username")} autoCapitalize="none" invalid={Boolean(err.username)} />
          </Field>
          <Field label="Rol" htmlFor="s-role" required error={err.role}>
            <Select id="s-role" value={v.role} onChange={set("role")}>
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name} ({PORTAL_LABEL[r.portal]})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="E-posta" htmlFor="s-mail" error={err.email} hint="Şifre sıfırlama için.">
            <Input id="s-mail" type="email" value={v.email} onChange={set("email")} invalid={Boolean(err.email)} />
          </Field>
          <Field label="Telefon" htmlFor="s-phone" error={err.phone}>
            <Input id="s-phone" type="tel" inputMode="tel" value={v.phone} onChange={(e) => setV((x) => ({ ...x, phone: maskPhoneInput(e.target.value) }))} invalid={Boolean(err.phone)} />
          </Field>
        </div>
        <Field label={row ? "Yeni şifre" : "İlk şifre"} htmlFor="s-pw" required={!row} error={err.password} hint={row ? "Boş bırakırsanız değişmez. Değişirse açık oturumları kapanır." : "En az 10 karakter. Kişiye güvenli bir yoldan iletin."}>
          <div className="flex gap-2">
            <Input id="s-pw" type={showPw ? "text" : "password"} value={v.password} onChange={set("password")} autoComplete="new-password" invalid={Boolean(err.password)} />
            <Button type="button" variant="secondary" className="shrink-0 px-3" onClick={() => (setV((x) => ({ ...x, password: randomPassword() })), setShowPw(true))}>
              Üret
            </Button>
          </div>
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function RoleDialog({ role, permissions, onClose, onDone }: { role: Role | null; permissions: PermissionDef[]; onClose: () => void; onDone: (t: string) => void }) {
  const locked = role?.key === "admin";
  const [v, setV] = useState<RoleFormValues>({
    name: role?.name ?? "",
    portal: role?.portal ?? "admin",
    permissions: locked ? permissions.map((p) => p.key) : role ? (JSON.parse(role.permissions) as string[]) : [],
  });
  const [res, setRes] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const groups = [...new Set(permissions.map((p) => p.group))];
  const toggle = (k: string) => setV((x) => ({ ...x, permissions: x.permissions.includes(k) ? x.permissions.filter((p) => p !== k) : [...x.permissions, k] }));
  const submit = () =>
    start(async () => {
      const r = await saveRoleAction(role?.key ?? null, v);
      setRes(r);
      if (r.ok) onDone(role ? "Rol güncellendi. Kullanıcılar bir sonraki sayfa açılışında yeni izinlerle çalışır." : "Rol eklendi.");
    });
  return (
    <Modal
      open
      title={role ? role.name : "Rol Ekle"}
      onClose={onClose}
      closeDisabled={pending}
      size="lg"
      footer={
        locked ? (
          <Button type="button" variant="secondary" onClick={onClose}>
            Kapat
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="button" onClick={submit} loading={pending}>
              Kaydet
            </Button>
          </>
        )
      }
    >
      <div className="grid gap-4">
        {locked ? <Alert kind="info">Yönetici rolü her zaman tüm izinlere sahiptir; kimse yanlışlıkla kilitlenmesin diye düzenlenemez.</Alert> : null}
        {res && !res.ok ? <Alert>{res.error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rol adı" htmlFor="r-name" required>
            <Input id="r-name" value={v.name} onChange={(e) => setV((x) => ({ ...x, name: e.target.value }))} disabled={locked} placeholder="örn. Sekreter, Yardımcı antrenör" />
          </Field>
          <Field label="Hangi panele girer?" htmlFor="r-portal" hint={role?.isSystem ? "Sistem rolünün paneli değişmez." : undefined}>
            <Select id="r-portal" value={v.portal} onChange={(e) => setV((x) => ({ ...x, portal: e.target.value }))} disabled={locked || role?.isSystem}>
              <option value="admin">Yönetim paneli</option>
              <option value="coach">Antrenör paneli</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <fieldset key={g} className="rounded-xl border border-line p-3">
              <legend className="px-1 text-sm font-bold text-ink">{g}</legend>
              <div className="grid gap-1.5">
                {permissions
                  .filter((p) => p.group === g)
                  .map((p) => (
                    <label key={p.key} className="flex cursor-pointer items-start gap-2 text-sm text-ink">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-gs-red" checked={v.permissions.includes(p.key)} onChange={() => toggle(p.key)} disabled={locked} />
                      {p.label}
                    </label>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>
      </div>
    </Modal>
  );
}
