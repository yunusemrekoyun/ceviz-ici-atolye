'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, MessageSquare, Tag, CheckCircle2, Send, Check, RotateCcw, Mail } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContactReq {
  id: string;
  name: string;
  category: string;
  message: string;
  ticketId: string;
  status: string; // open | resolved
  createdAt: string;
  adminReply?: string | null;
  repliedAt?: string | null;
  email?: string | null;
}

interface ThreadMessage { id: string; sender: string; body: string; createdAt: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConciergePanel({ tr: isTr }: { tr: boolean }) {
  const [requests, setRequests] = useState<ContactReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [replyingId, setReplyingId]     = useState<string | null>(null);
  const [replyDraft, setReplyDraft]     = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [resolvingId, setResolvingId]   = useState<string | null>(null);
  const [threadOpenId, setThreadOpenId] = useState<string | null>(null);
  const [thread, setThread]             = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const toggleThread = useCallback(async (id: string) => {
    if (threadOpenId === id) { setThreadOpenId(null); return; }
    setThreadOpenId(id);
    setThread([]);
    setThreadLoading(true);
    try {
      const d = await fetch(`/api/contact/${id}/messages`).then(r => r.json());
      if (d.ok) setThread(d.messages);
    } finally {
      setThreadLoading(false);
    }
  }, [threadOpenId]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contact');
      const data = await res.json();
      if (data.ok) setRequests(data.requests);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Persist open/resolved state to the DB so it survives refreshes and is shared
  // across all staff (not just the current browser session).
  const setStatus = useCallback(async (id: string, status: 'open' | 'resolved', notifyCustomer?: boolean) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(notifyCustomer !== undefined ? { notifyCustomer } : {}) }),
      });
      if (res.ok) {
        setRequests(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
        setResolvingId(null);
      }
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const startReply = useCallback((id: string) => {
    setReplyingId(id);
    setReplyDraft('');
  }, []);

  const submitReply = useCallback(async () => {
    if (!replyingId || !replyDraft.trim()) return;
    setReplyLoading(true);
    try {
      const res = await fetch(`/api/contact/${replyingId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyDraft }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        const now = new Date().toISOString();
        const sent = replyDraft;
        setRequests(prev => prev.map(r =>
          r.id === replyingId ? { ...r, adminReply: sent, repliedAt: now } : r,
        ));
        // If this thread is open, append the new staff message live.
        setThread(prev => (threadOpenId === replyingId ? [...prev, data.message] : prev));
        setReplyingId(null);
        setReplyDraft('');
      }
    } finally {
      setReplyLoading(false);
    }
  }, [replyingId, replyDraft, threadOpenId]);

  const open     = requests.filter(r => r.status !== 'resolved');
  const resolved = requests.filter(r => r.status === 'resolved');

  function renderCard(req: ContactReq) {
    const isResolved = req.status === 'resolved';
    const isUpdating = updatingId === req.id;

    return (
      <motion.div
        key={req.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden', transition: { duration: 0.2 } }}
        className={`surface-card p-4 hover:border-m-border2 transition-colors ${isResolved ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-2">

            {/* Top row */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-main">{req.name}</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-400/8 border border-purple-400/15 text-[10px] text-purple-400 font-medium">
                <Tag size={8} />
                {req.category}
              </span>
              <span className="font-mono text-[10px] text-subtle bg-m-surface2 px-1.5 py-0.5 rounded-md border border-m-border">
                {req.ticketId}
              </span>
              {req.adminReply && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                  <CheckCircle2 size={8} />
                  {isTr ? 'Yanıtlandı' : 'Replied'}
                </span>
              )}
              {isResolved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-m-surface2 border border-m-border text-[10px] text-subtle font-medium">
                  <Check size={8} />
                  {isTr ? 'Çözüldü' : 'Resolved'}
                </span>
              )}
            </div>

            {/* Contact email */}
            {req.email && (
              <p className="inline-flex items-center gap-1.5 text-[11px] text-subtle">
                <Mail size={10} />
                <a href={`mailto:${req.email}`} className="hover:text-main hover:underline">{req.email}</a>
              </p>
            )}

            {/* Message */}
            <p className="text-xs text-muted leading-relaxed">{req.message}</p>

            {/* Existing reply */}
            {req.adminReply && (
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-2.5">
                <p className="text-[9px] text-emerald-400 uppercase tracking-wider mb-1">
                  {isTr ? 'Yanıtınız' : 'Your reply'}
                  {req.repliedAt && ` · ${fmtDateTime(req.repliedAt)}`}
                </p>
                <p className="text-xs text-muted leading-relaxed">{req.adminReply}</p>
              </div>
            )}

            {/* Conversation thread */}
            <div>
              <button onClick={() => toggleThread(req.id)} className="text-[10px] text-purple-400 hover:underline">
                {threadOpenId === req.id ? (isTr ? 'Konuşmayı gizle' : 'Hide conversation') : (isTr ? 'Konuşmayı gör' : 'View conversation')}
              </button>
              {threadOpenId === req.id && (
                <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto border-t border-m-border pt-2">
                  {threadLoading ? (
                    <p className="text-[10px] text-subtle">…</p>
                  ) : thread.map(m => (
                    <div key={m.id} className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${m.sender === 'staff' ? 'bg-brand-accent/10 border border-brand-accent/15 text-muted ml-auto' : 'bg-m-surface2 text-main'}`}>
                      <p className="text-[8px] uppercase tracking-wider text-subtle mb-0.5">{m.sender === 'staff' ? (isTr ? 'Personel' : 'Staff') : (isTr ? 'Misafir' : 'Guest')}</p>
                      <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply form */}
            {replyingId === req.id ? (
              <div className="space-y-2 mt-1">
                <textarea
                  autoFocus
                  rows={3}
                  className="w-full control-base px-3 py-2 text-xs resize-none"
                  placeholder={isTr ? 'Yanıtınızı buraya yazın…' : 'Type your reply here…'}
                  value={replyDraft}
                  onChange={e => setReplyDraft(e.target.value)}
                />
                {!req.email && (
                  <p className="text-[10px] text-amber-400">
                    {isTr
                      ? 'Bu talepte e-posta adresi yok; yanıt misafire e-posta ile iletilemez.'
                      : 'No email on this request; the reply cannot be emailed to the guest.'}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={submitReply}
                    disabled={replyLoading || !replyDraft.trim()}
                    className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg disabled:opacity-60"
                  >
                    <Send size={11} />
                    {replyLoading ? '…' : (isTr ? 'Yanıtla' : 'Reply')}
                  </button>
                  <button
                    onClick={() => setReplyingId(null)}
                    className="px-3 py-1.5 text-xs text-subtle hover:text-main transition-colors"
                  >
                    {isTr ? 'İptal' : 'Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => startReply(req.id)}
                className="text-[11px] text-brand-accent hover:underline"
              >
                {req.adminReply
                  ? (isTr ? 'Yanıtı güncelle' : 'Update reply')
                  : (isTr ? 'Yanıtla' : 'Reply')}
              </button>
            )}

            {/* Timestamp */}
            <p className="text-[10px] text-subtle">{fmtDateTime(req.createdAt)}</p>

          </div>

          {/* Resolve / Reopen */}
          {isResolved ? (
            <button
              onClick={() => setStatus(req.id, 'open')}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold shrink-0 mt-0.5 border transition-colors disabled:opacity-50 text-subtle hover:text-main bg-m-surface hover:bg-m-hover border-m-border"
            >
              {isUpdating ? <RefreshCw size={11} className="animate-spin" /> : <RotateCcw size={11} />}
              {isTr ? 'Yeniden Aç' : 'Reopen'}
            </button>
          ) : resolvingId === req.id ? (
            <div className="flex flex-col gap-1 shrink-0 mt-0.5">
              <p className="text-[9px] text-subtle max-w-[130px] leading-tight">{isTr ? 'Müşteriye çözüldü maili gönderilsin mi?' : 'Email the customer?'}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setStatus(req.id, 'resolved', true)} disabled={isUpdating || !req.email} title={!req.email ? (isTr ? 'E-posta yok' : 'No email') : ''} className="px-2 py-1 rounded-lg text-[10px] font-semibold text-emerald-400 border border-emerald-500/25 bg-emerald-500/10 disabled:opacity-40">{isTr ? 'Evet' : 'Yes'}</button>
                <button onClick={() => setStatus(req.id, 'resolved', false)} disabled={isUpdating} className="px-2 py-1 rounded-lg text-[10px] text-subtle border border-m-border hover:bg-m-hover">{isTr ? 'Hayır' : 'No'}</button>
                <button onClick={() => setResolvingId(null)} className="px-1 text-subtle hover:text-main text-[11px]">✕</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setResolvingId(req.id)}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold shrink-0 mt-0.5 border transition-colors disabled:opacity-50 text-subtle hover:text-main bg-m-surface hover:bg-m-hover border-m-border"
            >
              <Check size={11} />
              {isTr ? 'Çöz' : 'Resolve'}
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
            <MessageSquare size={18} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-main leading-none">
              {isTr ? 'Müşteri Talepleri' : 'Customer Requests'}
            </h2>
            <p className="text-[11px] text-subtle mt-0.5">
              {loading
                ? '…'
                : `${open.length} ${isTr ? 'açık talep' : 'open requests'}`
                  + (resolved.length > 0 ? ` · ${resolved.length} ${isTr ? 'çözüldü' : 'resolved'}` : '')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {resolved.length > 0 && (
            <button
              onClick={() => setShowResolved(v => !v)}
              className="px-3 py-1.5 rounded-lg text-[11px] text-muted hover:text-main bg-m-surface hover:bg-m-hover border border-m-border transition-colors"
            >
              {showResolved
                ? (isTr ? 'Çözülenleri Gizle' : 'Hide Resolved')
                : (isTr ? `Çözülenleri Göster (${resolved.length})` : `Show Resolved (${resolved.length})`)}
            </button>
          )}
          <button
            onClick={fetchRequests}
            className="w-9 h-9 rounded-xl border border-m-border hover:bg-m-hover flex items-center justify-center text-subtle hover:text-main transition-colors"
            title={isTr ? 'Yenile' : 'Refresh'}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-brand-accent' : ''} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <RefreshCw size={20} className="animate-spin text-faint" />
          <span className="text-xs text-subtle">{isTr ? 'Yükleniyor…' : 'Loading…'}</span>
        </div>
      ) : open.length === 0 && !showResolved ? (
        <div className="panel-glass-dashed">
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl surface-soft flex items-center justify-center">
              <MessageSquare size={22} className="text-faint" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-subtle">
                {resolved.length > 0
                  ? (isTr ? 'Tüm talepler çözüldü' : 'All requests resolved')
                  : (isTr ? 'Henüz müşteri talebi yok' : 'No customer requests yet')}
              </p>
              <p className="text-xs text-faint">
                {isTr
                  ? 'Misafirlerden gelen talepler burada görünecek'
                  : 'Requests from guests will appear here'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {open.map(renderCard)}
          </AnimatePresence>

          {showResolved && resolved.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[10px] text-subtle uppercase tracking-widest px-1">
                {isTr ? 'Çözülenler' : 'Resolved'}
              </p>
              <AnimatePresence>
                {resolved.map(renderCard)}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
