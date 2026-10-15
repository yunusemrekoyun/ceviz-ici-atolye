'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Trash2, Pencil, X, Check, Gift, Star } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface CouponProduct {
  id: string;
  name: string;
  pointsCost: number;
  discountType: string;
  value: number;
  minSpend: number;
  maxDiscount: number | null;
  expiresInDays: number | null;
  isActive: boolean;
}

interface Props { tr: boolean }

const emptyForm = {
  name: '', pointsCost: 500, discountType: 'percent' as 'percent' | 'fixed',
  value: 10, minSpend: 0, maxDiscount: '', expiresInDays: '', isActive: true,
};

function discountLabel(p: { discountType: string; value: number }, tr: boolean) {
  return p.discountType === 'percent' ? `%${p.value}` : `₺${p.value.toLocaleString('tr-TR')}`;
}

function ProductModal({ tr, initial, onClose, onSaved }: {
  tr: boolean; initial: CouponProduct | null; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState(initial ? {
    name: initial.name, pointsCost: initial.pointsCost, discountType: initial.discountType as 'percent' | 'fixed',
    value: initial.value, minSpend: initial.minSpend,
    maxDiscount: initial.maxDiscount?.toString() ?? '', expiresInDays: initial.expiresInDays?.toString() ?? '',
    isActive: initial.isActive,
  } : emptyForm);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name.trim()) { toast.error(tr ? 'İsim gerekli.' : 'Name required.'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        pointsCost: Number(form.pointsCost),
        discountType: form.discountType,
        value: Number(form.value),
        minSpend: Number(form.minSpend) || 0,
        maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount),
        expiresInDays: form.expiresInDays === '' ? null : Number(form.expiresInDays),
        isActive: form.isActive,
      };
      const res = await fetch(initial ? `/api/coupon-products/${initial.id}` : '/api/coupon-products', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.message);
      toast.success(tr ? 'Kaydedildi.' : 'Saved.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata.' : 'Error.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-md modal-shell" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-m-border">
            <p className="text-sm font-bold text-main">{initial ? (tr ? 'Kuponu Düzenle' : 'Edit Coupon') : (tr ? 'Yeni Kupon' : 'New Coupon')}</p>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-subtle hover:text-main hover:bg-m-hover"><X size={14} /></button>
          </div>
          <div className="p-5 space-y-3.5">
            <div>
              <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'İsim' : 'Name'}</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder={tr ? 'Örn: %10 İndirim' : 'e.g. 10% Off'} className="control-base px-3 py-2 text-sm w-full" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Puan Bedeli' : 'Points Cost'}</label>
                <input type="number" min={1} value={form.pointsCost} onChange={e => set('pointsCost', Number(e.target.value))} className="control-base px-3 py-2 text-sm w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'İndirim Türü' : 'Type'}</label>
                <select value={form.discountType} onChange={e => set('discountType', e.target.value as 'percent' | 'fixed')} className="control-base px-3 py-2 text-sm w-full appearance-none">
                  <option value="percent">{tr ? 'Yüzde (%)' : 'Percent (%)'}</option>
                  <option value="fixed">{tr ? 'Sabit (₺)' : 'Fixed (₺)'}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{form.discountType === 'percent' ? (tr ? 'İndirim %' : 'Discount %') : (tr ? 'İndirim ₺' : 'Discount ₺')}</label>
                <input type="number" min={1} value={form.value} onChange={e => set('value', Number(e.target.value))} className="control-base px-3 py-2 text-sm w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Min. Tutar ₺' : 'Min Spend ₺'}</label>
                <input type="number" min={0} value={form.minSpend} onChange={e => set('minSpend', Number(e.target.value))} className="control-base px-3 py-2 text-sm w-full" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Maks. İndirim ₺' : 'Max Disc. ₺'}</label>
                <input type="number" min={0} value={form.maxDiscount} onChange={e => set('maxDiscount', e.target.value)} placeholder={tr ? 'opsiyonel' : 'optional'} className="control-base px-3 py-2 text-sm w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Geçerlilik (gün)' : 'Valid (days)'}</label>
                <input type="number" min={1} value={form.expiresInDays} onChange={e => set('expiresInDays', e.target.value)} placeholder={tr ? 'süresiz' : 'no expiry'} className="control-base px-3 py-2 text-sm w-full" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="accent-brand-accent" />
              {tr ? 'Mağazada aktif' : 'Active in store'}
            </label>
          </div>
          <div className="flex gap-2.5 px-5 pb-5">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">{tr ? 'İptal' : 'Cancel'}</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{tr ? 'Kaydet' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminLoyalty({ tr }: Props) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);
  const [products, setProducts] = useState<CouponProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [editing, setEditing] = useState<CouponProduct | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        fetch('/api/settings/loyalty').then(r => r.json()),
        fetch('/api/coupon-products').then(r => r.json()),
      ]);
      if (s.ok) setEnabled(s.enabled);
      if (p.ok) setProducts(p.products);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function toggle() {
    setTogglingEnabled(true);
    try {
      const res = await fetch('/api/settings/loyalty', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !enabled }),
      });
      const d = await res.json();
      if (d.ok) { setEnabled(d.enabled); toast.success(d.enabled ? (tr ? 'Sadakat programı açıldı.' : 'Loyalty enabled.') : (tr ? 'Sadakat programı kapatıldı.' : 'Loyalty disabled.')); }
    } finally {
      setTogglingEnabled(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/coupon-products/${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!d.ok) throw new Error(d.message);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success(tr ? 'Silindi.' : 'Deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata.' : 'Error.'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Toggle */}
      <div className="surface-card p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
            <Star size={18} className="text-brand-accent" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-main">{tr ? 'Sadakat Programı' : 'Loyalty Program'}</h2>
            <p className="text-[11px] text-subtle mt-0.5 max-w-md">
              {tr
                ? 'Kapatıldığında müşteri panelindeki puan kartı ve kupon mağazası gizlenir; puanlar ve kuponlar silinmez. Kupon girme alanı her zaman açık kalır.'
                : 'When off, the points card and coupon store hide on the customer panel; points/coupons are kept. The coupon entry field stays available.'}
            </p>
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={togglingEnabled || loading}
          className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${enabled ? 'bg-brand-accent' : 'bg-m-surface2'} disabled:opacity-50`}
          title={enabled ? (tr ? 'Açık' : 'On') : (tr ? 'Kapalı' : 'Off')}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${enabled ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Catalog */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-main flex items-center gap-2"><Gift size={15} className="text-brand-accent" /> {tr ? 'Kupon Kataloğu' : 'Coupon Catalog'}</h3>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm">
          <Plus size={14} /> {tr ? 'Yeni Kupon' : 'New Coupon'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-brand-accent/50" /></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-faint border border-dashed border-m-border rounded-2xl">
          <Gift size={28} />
          <p className="text-sm">{tr ? 'Henüz kupon ürünü yok.' : 'No coupon products yet.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map(p => (
            <div key={p.id} className={`surface-card px-4 py-3 flex items-center gap-4 ${!p.isActive ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-main">{p.name}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-brand-accent/20 bg-brand-accent/10 text-brand-accent">
                    <Star size={9} /> {p.pointsCost} {tr ? 'puan' : 'pts'}
                  </span>
                  {!p.isActive && <span className="text-[10px] text-subtle">({tr ? 'pasif' : 'inactive'})</span>}
                </div>
                <p className="text-[11px] text-muted mt-1">
                  {discountLabel(p, tr)} {tr ? 'indirim' : 'off'}
                  {p.minSpend > 0 && ` · min ₺${p.minSpend.toLocaleString('tr-TR')}`}
                  {p.maxDiscount != null && ` · maks ₺${p.maxDiscount.toLocaleString('tr-TR')}`}
                  {p.expiresInDays != null && ` · ${p.expiresInDays} ${tr ? 'gün' : 'days'}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => { setEditing(p); setShowModal(true); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-subtle hover:text-brand-accent hover:bg-brand-accent/8 transition-all"><Pencil size={13} /></button>
                {deletingId === p.id ? <Loader2 size={13} className="animate-spin text-subtle" /> : (
                  <button onClick={() => remove(p.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-subtle hover:text-red-400 hover:bg-red-500/8 transition-all"><Trash2 size={12} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ProductModal tr={tr} initial={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchAll(); }} />
      )}
    </div>
  );
}
