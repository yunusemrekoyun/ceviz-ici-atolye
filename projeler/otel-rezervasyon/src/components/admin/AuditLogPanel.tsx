'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileClock, Loader2, Search, ShieldCheck } from 'lucide-react';

interface AuditLog {
  id: string;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
}

export function AuditLogPanel({ tr }: { tr: boolean }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams({ take: '100' });
    if (action.trim()) params.set('action', action.trim());
    if (actor.trim()) params.set('actor', actor.trim());
    return params.toString();
  }, [action, actor]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/audit-logs?${query}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.ok) setLogs(data.logs);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="panel-glass-raised px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
              <FileClock size={18} className="text-brand-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-main">{tr ? 'İşlem Logları' : 'Audit Logs'}</h2>
              <p className="text-xs text-subtle">
                {tr ? 'Kritik sistem işlemleri ve yetkili kullanıcı hareketleri.' : 'Critical system and staff activity trail.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-auto">
            <label className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                value={actor}
                onChange={(event) => setActor(event.target.value)}
                placeholder={tr ? 'Kullanıcı ara' : 'Search actor'}
                className="input-base pl-8 h-9 text-xs"
              />
            </label>
            <label className="relative">
              <ShieldCheck size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                value={action}
                onChange={(event) => setAction(event.target.value)}
                placeholder={tr ? 'İşlem ara' : 'Search action'}
                className="input-base pl-8 h-9 text-xs"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="panel-glass-raised overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center text-subtle">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-subtle">
            {tr ? 'Log kaydı bulunamadı.' : 'No audit logs found.'}
          </div>
        ) : (
          <div className="divide-y divide-m-border">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2 hover:bg-m-hover">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-main truncate">{log.summary}</p>
                  <p className="text-[11px] text-subtle mt-1">
                    {log.action} · {log.entityType}{log.entityId ? `:${log.entityId.slice(0, 8)}` : ''}
                  </p>
                </div>
                <div className="lg:text-right text-[11px] text-subtle">
                  <p>{log.actorEmail ?? (tr ? 'Sistem' : 'System')} {log.actorRole ? `· ${log.actorRole}` : ''}</p>
                  <p>{new Date(log.createdAt).toLocaleString(tr ? 'tr-TR' : 'en-GB')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
