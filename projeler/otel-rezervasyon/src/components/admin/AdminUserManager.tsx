'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Search, Pencil, Trash2, Loader2, X, Check,
  ShieldCheck, UserRound, ChevronDown, AlertTriangle,
  CalendarDays, BookOpen, Phone, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { PhoneInput } from '@/components/ui/PhoneInput';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Role {
  id: string;
  name: string;
  slug: string;
}

interface UserRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  role: Role;
  _count: { reservations: number };
}

interface Props {
  tr: boolean;
  currentUserId: string;
}

// ── Role styling ──────────────────────────────────────────────────────────────

const ROLE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  admin:       { bg: 'bg-brand-accent/10', text: 'text-brand-accent',  border: 'border-brand-accent/25' },
  personel:    { bg: 'bg-sky-400/10',      text: 'text-sky-400',        border: 'border-sky-400/25'      },
  muhasebe:    { bg: 'bg-violet-400/10',   text: 'text-violet-400',     border: 'border-violet-400/25'   },
  musteri:     { bg: 'bg-emerald-400/10',  text: 'text-emerald-400',    border: 'border-emerald-400/25'  },
  temizlikci:  { bg: 'bg-amber-400/10',    text: 'text-amber-400',      border: 'border-amber-400/25'    },
};

// Müşteriler bu panelin dışında — sadece iç ekip
const STAFF_SLUGS = ['admin', 'personel', 'muhasebe', 'temizlikci'] as const;
const ROLE_FILTER_SLUGS = ['all', ...STAFF_SLUGS] as const;
type RoleFilter = typeof ROLE_FILTER_SLUGS[number];

// ── Sub-components ────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  const s = ROLE_STYLE[role.slug] ?? { bg: 'bg-m-surface2', text: 'text-muted', border: 'border-m-border' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      <ShieldCheck size={9} />
      {role.name}
    </span>
  );
}

function Avatar({ user }: { user: UserRow }) {
  const initials = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user.email[0].toUpperCase();
  const s = ROLE_STYLE[user.role.slug] ?? { bg: 'bg-m-surface2', text: 'text-muted', border: 'border-m-border' };
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 border ${s.bg} ${s.text} ${s.border}`}>
      {initials}
    </div>
  );
}

// ── RoleDropdown ──────────────────────────────────────────────────────────────

function RoleDropdown({
  roles, value, onChange,
}: { roles: Role[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = roles.find(r => r.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="control-base flex items-center gap-2 px-3 py-2 text-sm w-full"
      >
        {selected && <RoleBadge role={selected} />}
        <span className="flex-1 text-left">{selected?.name ?? '—'}</span>
        <ChevronDown size={12} className="text-subtle shrink-0" />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 modal-shell overflow-y-auto z-[200] max-h-52"
        >
          {roles.map(r => {
            const s = ROLE_STYLE[r.slug] ?? { bg: '', text: 'text-muted', border: '' };
            const isActive = r.id === value;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => { onChange(r.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-m-surface2' : 'hover:bg-m-hover'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.bg.replace('/10', '')} ${s.bg.includes('brand') ? 'bg-brand-accent' : ''}`} />
                <span className={`flex-1 text-left ${s.text}`}>{r.name}</span>
                {isActive && <Check size={11} className="text-brand-accent shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── EditModal ─────────────────────────────────────────────────────────────────

function EditModal({
  user, roles, tr, onClose, onSave,
}: {
  user: UserRow;
  roles: Role[];
  tr: boolean;
  onClose: () => void;
  onSave: (updated: UserRow) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: user.firstName ?? '',
    lastName:  user.lastName  ?? '',
    phone:     user.phone     ?? '',
    roleId:    user.role.id,
    isActive:  user.isActive,
  });

  const set = (key: keyof typeof form, val: string | boolean) =>
    setForm(f => ({ ...f, [key]: val }));

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast.success(tr ? 'Kullanıcı güncellendi.' : 'User updated.');
      onSave(data.user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata oluştu.' : 'Error occurred.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        className="w-full max-w-md modal-shell"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-m-border rounded-t-2xl overflow-hidden">
          <div className="flex items-center gap-2.5">
            <Avatar user={user} />
            <div>
              <p className="text-sm font-bold text-main leading-none">
                {user.firstName || user.lastName ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : user.email}
              </p>
              <p className="text-[11px] text-subtle mt-0.5">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-subtle hover:text-main hover:bg-m-hover transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Ad' : 'First Name'}</label>
              <input
                value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
                placeholder={tr ? 'Ad' : 'First name'}
                className="control-base px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Soyad' : 'Last Name'}</label>
              <input
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
                placeholder={tr ? 'Soyad' : 'Last name'}
                className="control-base px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Telefon' : 'Phone'}</label>
            <PhoneInput
              value={form.phone ?? ''}
              onChange={v => set('phone', v)}
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Rol' : 'Role'}</label>
            <RoleDropdown roles={roles} value={form.roleId} onChange={id => set('roleId', id)} />
          </div>

          {/* Active toggle */}
          <button
            type="button"
            onClick={() => set('isActive', !form.isActive)}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
              form.isActive
                ? 'bg-emerald-400/6 border-emerald-400/15 text-emerald-400'
                : 'bg-red-400/6 border-red-400/15 text-red-400'
            }`}
          >
            <span className="text-sm font-medium">
              {form.isActive ? (tr ? 'Hesap Aktif' : 'Account Active') : (tr ? 'Hesap Pasif' : 'Account Inactive')}
            </span>
            {form.isActive
              ? <ToggleRight size={20} />
              : <ToggleLeft size={20} />
            }
          </button>

        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 pb-5 rounded-b-2xl overflow-hidden">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">
            {tr ? 'İptal' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {tr ? 'Kaydet' : 'Save'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

// ── DeleteModal ───────────────────────────────────────────────────────────────

function DeleteModal({
  user, tr, onClose, onConfirm,
}: {
  user: UserRow;
  tr: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        className="w-full max-w-sm modal-shell overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-main">{tr ? 'Kullanıcıyı Sil' : 'Delete User'}</p>
              <p className="text-[11px] text-subtle mt-1 leading-relaxed">
                {tr
                  ? `"${displayName}" adlı kullanıcı kalıcı olarak silinecek. Bu işlem geri alınamaz.`
                  : `"${displayName}" will be permanently deleted. This action cannot be undone.`}
              </p>
            </div>
          </div>
          <div className="flex gap-2.5 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">{tr ? 'İptal' : 'Cancel'}</button>
            <button
              onClick={onConfirm}
              className="flex-1 text-sm px-4 py-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-colors font-medium"
            >
              {tr ? 'Sil' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminUserManager({ tr, currentUserId }: Props) {
  const toast = useToast();

  const [users, setUsers]       = useState<UserRow[]>([]);
  const [roles, setRoles]       = useState<Role[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setUsers(data.users);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Derive assignable roles (staff only — no musteri)
  useEffect(() => {
    const seen = new Map<string, Role>();
    users.forEach(u => {
      if (!seen.has(u.role.id) && (STAFF_SLUGS as readonly string[]).includes(u.role.slug)) {
        seen.set(u.role.id, u.role);
      }
    });
    const order = [...STAFF_SLUGS];
    setRoles([...seen.values()].sort((a, b) => order.indexOf(a.slug as typeof STAFF_SLUGS[number]) - order.indexOf(b.slug as typeof STAFF_SLUGS[number])));
  }, [users]);

  // Only show staff users in this panel
  const staffUsers = users.filter(u => (STAFF_SLUGS as readonly string[]).includes(u.role.slug));

  const filtered = staffUsers.filter(u => {
    if (roleFilter !== 'all' && u.role.slug !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase();
      if (!name.includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Stats — staff only
  const stats = [
    { label: tr ? 'Toplam Ekip'  : 'Total Staff',    value: staffUsers.length,                                             cls: 'text-main' },
    { label: 'Admin',                                 value: staffUsers.filter(u => u.role.slug === 'admin').length,        cls: 'text-brand-accent' },
    { label: tr ? 'Personel'     : 'Staff',           value: staffUsers.filter(u => u.role.slug === 'personel').length,    cls: 'text-sky-400' },
    { label: tr ? 'Temizlikçi'   : 'Housekeeping',   value: staffUsers.filter(u => u.role.slug === 'temizlikci').length,   cls: 'text-amber-400' },
    { label: tr ? 'Pasif'        : 'Inactive',        value: staffUsers.filter(u => !u.isActive).length,                   cls: 'text-red-400' },
  ];

  async function handleDelete(user: UserRow) {
    setDeleteTarget(null);
    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast.success(tr ? 'Kullanıcı silindi.' : 'User deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata oluştu.' : 'Error occurred.'));
    } finally {
      setDeletingId(null);
    }
  }

  function handleSaved(updated: UserRow) {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setEditTarget(null);
  }

  const filterLabels: Record<RoleFilter, string> = {
    all:        tr ? 'Tümü'       : 'All',
    admin:      'Admin',
    personel:   tr ? 'Personel'   : 'Staff',
    muhasebe:   tr ? 'Muhasebe'   : 'Accounting',
    temizlikci: tr ? 'Kat Hizmetleri' : 'Housekeeping',
  };

  return (
    <div className="space-y-4">

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {stats.map(s => (
          <div key={s.label} className="surface-card px-3 py-2.5">
            <p className={`text-xl font-black tabular-nums leading-none ${s.cls}`}>{loading ? '—' : s.value}</p>
            <p className="text-[10px] text-subtle mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search + role filter ── */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tr ? 'Ad, soyad veya e-posta ara...' : 'Search name or email...'}
            className="control-base pl-9 pr-3 py-2 text-sm"
          />
        </div>

        {/* Role filter */}
        <div className="tab-list">
          {ROLE_FILTER_SLUGS.map(slug => {
            const isActive = roleFilter === slug;
            return (
              <button
                key={slug}
                onClick={() => setRoleFilter(slug)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/20'
                    : 'text-muted hover:text-main border border-transparent hover:bg-m-hover'
                }`}
              >
                {filterLabels[slug]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── User list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-brand-accent/50" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-faint">
          <Users size={32} />
          <p className="text-sm">{tr ? 'Kullanıcı bulunamadı.' : 'No users found.'}</p>
        </div>
      ) : (
        <div className="table-shell">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 px-4 py-2.5 border-b border-m-border text-[10px] text-subtle uppercase tracking-widest font-semibold">
            <span className="w-9" />
            <span>{tr ? 'Kullanıcı' : 'User'}</span>
            <span className="text-right hidden sm:block">{tr ? 'Rezervasyon' : 'Reservations'}</span>
            <span className="text-right">{tr ? 'Kayıt' : 'Joined'}</span>
            <span className="w-16 text-right">{tr ? 'İşlem' : 'Actions'}</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-m-border">
            {filtered.map(user => {
              const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
              const joinDate = new Date(user.createdAt).toLocaleDateString(tr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', year: '2-digit' });
              const isMe = user.id === currentUserId;

              return (
                <div
                  key={user.id}
                  className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 items-center px-4 py-3 transition-colors hover:bg-m-hover ${!user.isActive ? 'opacity-60' : ''}`}
                >
                  {/* Avatar */}
                  <Avatar user={user} />

                  {/* User info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-main leading-none truncate">{displayName}</span>
                      <RoleBadge role={user.role} />
                      {isMe && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-m-surface2 text-subtle border border-m-border">
                          {tr ? 'Sen' : 'You'}
                        </span>
                      )}
                      {!user.isActive && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                          {tr ? 'Pasif' : 'Inactive'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-muted truncate">{user.email}</span>
                      {user.phone && (
                        <span className="hidden sm:flex items-center gap-1 text-[11px] text-subtle">
                          <Phone size={9} /> {user.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reservation count */}
                  <div className="hidden sm:flex items-center gap-1 text-[11px] text-subtle">
                    <BookOpen size={10} />
                    {user._count.reservations}
                  </div>

                  {/* Join date */}
                  <div className="flex items-center gap-1 text-[11px] text-subtle">
                    <CalendarDays size={10} className="shrink-0 hidden sm:block" />
                    <span className="tabular-nums">{joinDate}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 justify-end w-16">
                    <button
                      onClick={() => setEditTarget(user)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-subtle hover:text-main hover:bg-m-hover border border-transparent hover:border-m-border transition-all"
                    >
                      <Pencil size={12} />
                    </button>
                    {deletingId === user.id ? (
                      <div className="w-7 h-7 flex items-center justify-center">
                        <Loader2 size={12} className="animate-spin text-subtle" />
                      </div>
                    ) : (
                      <button
                        onClick={() => !isMe && setDeleteTarget(user)}
                        disabled={isMe}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center border border-transparent transition-all ${
                          isMe
                            ? 'text-faint cursor-not-allowed'
                            : 'text-subtle hover:text-red-400 hover:bg-red-500/8 hover:border-red-500/15'
                        }`}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {editTarget && (
        <EditModal
          user={editTarget}
          roles={roles}
          tr={tr}
          onClose={() => setEditTarget(null)}
          onSave={handleSaved}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          tr={tr}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}

    </div>
  );
}
