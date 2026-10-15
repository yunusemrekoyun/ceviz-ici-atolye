"use client";

import { useState, useEffect } from "react";
import { X, Phone, Mail, Calendar, Activity, Weight, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { initials, formatDate } from "@/lib/utils";

interface MemberPreview {
  id: string;
  memberNo: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  gender: string | null;
  birthDate: string | null;
  activePlan: { name: string; endDate: string } | null;
  lastCheckIn: string | null;
  lastWeight: number | null;
}

interface Props {
  memberId: string;
  onClose: () => void;
}

export function MemberPreviewModal({ memberId, onClose }: Props) {
  const [data, setData]     = useState<MemberPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/members/${memberId}/preview`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Yüklenemedi"))
      .finally(() => setLoading(false));
  }, [memberId]);

  const hasActive = !!data?.activePlan && new Date(data.activePlan.endDate) > new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-[var(--bg-card)] rounded-3xl border border-subtle-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
          <span className="text-sm font-semibold">Üye Bilgisi</span>
          <button onClick={onClose} className="btn-ghost btn-sm p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-neon" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-rose-400 text-sm">{error}</div>
          )}

          {data && (
            <div className="space-y-4">
              {/* Avatar + isim */}
              <div className="flex items-center gap-4">
                {data.avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={data.avatarUrl} alt={data.name} className="w-16 h-16 rounded-2xl object-cover" />
                  : <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 font-bold text-xl">{initials(data.name)}</div>
                }
                <div>
                  <div className="font-bold text-lg leading-tight">{data.name}</div>
                  <div className="text-xs text-muted mt-0.5">No: {data.memberNo}</div>
                  <div className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${hasActive ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                    {hasActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {hasActive ? "Üyelik Aktif" : "Üyelik Yok"}
                  </div>
                </div>
              </div>

              {/* Plan */}
              {data.activePlan && (
                <div className="rounded-xl bg-neon/5 border border-neon/15 px-4 py-3">
                  <div className="text-xs text-neon font-semibold">{data.activePlan.name}</div>
                  <div className="text-xs text-muted mt-0.5">{formatDate(new Date(data.activePlan.endDate))} tarihine kadar</div>
                </div>
              )}

              {/* Detaylar */}
              <div className="space-y-2">
                {data.phone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone className="w-4 h-4 text-muted shrink-0" />
                    <a href={`tel:${data.phone}`} className="hover:text-neon transition-colors">{data.phone}</a>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="w-4 h-4 text-muted shrink-0" />
                  <span className="text-body truncate">{data.email}</span>
                </div>
                {data.lastCheckIn && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Activity className="w-4 h-4 text-muted shrink-0" />
                    <span className="text-body">Son giriş: {formatDate(new Date(data.lastCheckIn))}</span>
                  </div>
                )}
                {data.lastWeight && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Weight className="w-4 h-4 text-muted shrink-0" />
                    <span className="text-body">Son ölçüm: {data.lastWeight} kg</span>
                  </div>
                )}
                {data.birthDate && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Calendar className="w-4 h-4 text-muted shrink-0" />
                    <span className="text-body">{formatDate(new Date(data.birthDate))}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
