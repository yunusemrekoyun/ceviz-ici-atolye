"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  LogIn,
  LogOut as LogOutIcon,
  BedDouble,
  X,
  AlertCircle,
  RefreshCw,
  QrCode,
  CheckCircle2,
  Camera,
  Hash,
  DoorOpen,
  ArrowRight,
  Upload,
  FileText,
  Car,
  StickyNote,
  Users,
} from "lucide-react";
import { useTheme } from "@/theme/ThemeContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ResRoom {
  id: string;
  name: string;
  floor: number | null;
  roomType: { name: string };
}

interface Res {
  id: string;
  confirmationId: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adultsCount: number;
  childrenCount: number;
  specialRequests?: string | null;
  room: ResRoom;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUS_MAP: Record<string, { tr: string; en: string; cls: string }> = {
  pending: {
    tr: "Bekliyor",
    en: "Pending",
    cls: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  confirmed: {
    tr: "Onaylı",
    en: "Confirmed",
    cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  checked_in: {
    tr: "Odada",
    en: "In Room",
    cls: "text-brand-accent bg-brand-accent/10 border-brand-accent/20",
  },
  checked_out: {
    tr: "Ayrıldı",
    en: "Checked Out",
    cls: "text-muted bg-m-surface2 border-m-border",
  },
  cancelled: {
    tr: "İptal",
    en: "Cancelled",
    cls: "text-red-400 bg-red-400/10 border-red-400/20",
  },
};

function StatusBadge({ status, isTr }: { status: string; isTr: boolean }) {
  const s = STATUS_MAP[status] ?? {
    tr: status,
    en: status,
    cls: "text-muted bg-m-surface2 border-m-border",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold shrink-0 ${s.cls}`}
    >
      {isTr ? s.tr : s.en}
    </span>
  );
}

// ── QR Scanner Modal ──────────────────────────────────────────────────────────

function QRScannerModal({
  onCode,
  onClose,
  isTr,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
  isTr: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanningRef = useRef(true);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animFrame = 0;
    scanningRef.current = true; // reset for StrictMode double-invoke

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch((err: Error) => {
          if (err.name !== 'AbortError') throw err;
        });
        if (!scanningRef.current) return;
        scan();
      } catch (err) {
        console.error("Camera error:", err);
        setCamError(
          isTr ? "Kameraya erişim sağlanamadı." : "Camera access denied.",
        );
      }
    }

    async function scan() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BD = (window as any).BarcodeDetector;
      if (!BD) {
        setCamError(
          isTr
            ? "Tarayıcınız kamera ile QR taramayı desteklemiyor.\nFiziksel QR okuyucu kullanın."
            : "Browser QR scanning unsupported.\nUse a physical QR scanner.",
        );
        return;
      }

      // Verify qr_code format is actually supported
      try {
        const supported: string[] = await BD.getSupportedFormats();
        if (!supported.includes("qr_code")) {
          setCamError(
            isTr
              ? "Tarayıcınız QR kod formatını desteklemiyor.\nFiziksel QR okuyucu kullanın."
              : "Browser does not support qr_code format.\nUse a physical QR scanner.",
          );
          return;
        }
      } catch { /* getSupportedFormats not available in all builds — proceed */ }

      const detector = new BD({ formats: ["qr_code"] });

      // Canvas snapshot approach — more reliable than passing video element directly
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      console.debug("[QR] Scanner started");

      async function detect() {
        if (!scanningRef.current || !videoRef.current || !ctx) return;
        if (videoRef.current.readyState < 2) {
          animFrame = requestAnimationFrame(detect);
          return;
        }
        try {
          const { videoWidth: w, videoHeight: h } = videoRef.current;
          if (w > 0 && h > 0) {
            if (canvas.width !== w) canvas.width = w;
            if (canvas.height !== h) canvas.height = h;
            ctx.drawImage(videoRef.current, 0, 0, w, h);
            const results: Array<{ rawValue: string }> = await detector.detect(canvas);
            if (results.length > 0) {
              const val = results[0].rawValue.trim();
              console.debug("[QR] detected:", val);
              if (/^\d{8}$/.test(val)) {
                onCode(val);
                return;
              }
            }
          }
        } catch (err) {
          console.warn("[QR] detect error:", err);
        }
        animFrame = requestAnimationFrame(detect);
      }
      detect();
    }

    start();
    return () => {
      scanningRef.current = false;
      cancelAnimationFrame(animFrame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [isTr, onCode]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <QrCode size={14} className="text-brand-accent" />
            <p className="text-sm font-semibold text-white/90">
              {isTr ? "QR Kod Tara" : "Scan QR Code"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-white/8 flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="relative bg-black" style={{ aspectRatio: "1" }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />

          {!camError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-black/35" />
              <div className="relative w-52 h-52 z-10">
                {(["tl", "tr", "bl", "br"] as const).map((c) => (
                  <div
                    key={c}
                    className={`absolute w-9 h-9 border-brand-accent ${
                      c === "tl"
                        ? "top-0 left-0 border-t-2 border-l-2 rounded-tl-xl"
                        : c === "tr"
                          ? "top-0 right-0 border-t-2 border-r-2 rounded-tr-xl"
                          : c === "bl"
                            ? "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl"
                            : "bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl"
                    }`}
                  />
                ))}
                <motion.div
                  className="absolute inset-x-2 h-px bg-gradient-to-r from-transparent via-brand-accent to-transparent"
                  animate={{ top: ["12%", "88%", "12%"] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
            </div>
          )}

          {camError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6">
              <Camera size={36} className="text-white/15" />
              <p className="text-white/40 text-sm text-center whitespace-pre-line">
                {camError}
              </p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 text-center border-t border-white/8">
          <p className="text-xs text-white/25">
            {isTr
              ? "Misafirin telefonundaki QR kodu kameranıza gösterin"
              : "Point camera at guest's QR code"}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Detail Card (after search or row click) ───────────────────────────────────

function DetailCard({
  res,
  onClose,
  onCheckinRequest,
  onCheckoutRequest,
  loading,
  isTr,
  successId,
  checkInTime,
  checkOutTime,
}: {
  res: Res;
  onClose: () => void;
  onCheckinRequest: (confirmationId: string) => void;
  onCheckoutRequest: (confirmationId: string) => void;
  loading: boolean;
  isTr: boolean;
  successId: string | null;
  checkInTime: string;
  checkOutTime: string;
}) {
  const canCheckin = ["pending", "confirmed"].includes(res.status);
  const canCheckout = res.status === "checked_in";
  const isSuccess = successId === res.confirmationId;

  const accentColor = canCheckin
    ? "rgba(52,211,153,0.2)"
    : canCheckout
      ? "rgba(var(--app-accent-rgb,255,183,128),0.2)"
      : "var(--m-surface)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: canCheckin
          ? "rgba(52,211,153,0.22)"
          : canCheckout
            ? "rgba(255,183,128,0.22)"
            : "rgba(255,255,255,0.08)",
      }}
    >
      {/* Top accent stripe */}
      <div
        className="h-[3px]"
        style={{
          background: canCheckin
            ? "linear-gradient(90deg,#34d399 0%,transparent 70%)"
            : canCheckout
              ? "linear-gradient(90deg,var(--app-accent,#ffb780) 0%,transparent 70%)"
              : "none",
        }}
      />

      <div className="p-5 space-y-4" style={{ background: accentColor }}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] text-subtle uppercase tracking-widest mb-1.5">
              {isTr ? "Rezervasyon" : "Reservation"}
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-2xl font-black text-main tracking-[0.15em]">
                {res.confirmationId}
              </span>
              <StatusBadge status={res.status} isTr={isTr} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-m-hover flex items-center justify-center text-subtle hover:text-main transition-colors shrink-0 mt-1"
          >
            <X size={13} />
          </button>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: isTr ? "Oda" : "Room",
              value: res.room.name,
              sub: `${res.room.roomType.name}${res.room.floor ? ` · Kat ${res.room.floor}` : ""}`,
            },
            {
              label: isTr ? "Misafir" : "Guest",
              value: `${res.firstName} ${res.lastName}`,
              sub: res.phone,
            },
            {
              label: isTr ? "Giriş" : "Check-in",
              value: fmtDate(res.checkInDate),
              sub: checkInTime,
            },
            {
              label: isTr ? "Çıkış / Gece" : "Check-out / Nights",
              value: fmtDate(res.checkOutDate),
              sub: `${checkOutTime} · ${res.nights} ${isTr ? "gece" : "nights"} · ${res.adultsCount}${isTr ? "y" : "a"}${res.childrenCount > 0 ? `+${res.childrenCount}` : ""}`,
            },
          ].map(({ label, value, sub }) => (
            <div key={label} className="surface-soft p-3 min-w-0">
              <p className="text-[9px] text-subtle uppercase tracking-wider mb-1">
                {label}
              </p>
              <p className="text-sm font-bold text-main leading-snug truncate">
                {value}
              </p>
              {sub && (
                <p className="text-[10px] text-subtle truncate">{sub}</p>
              )}
            </div>
          ))}
        </div>

        {res.specialRequests && (
          <div className="px-3 py-2 bg-amber-400/5 border border-amber-400/12 rounded-xl text-xs text-amber-400/65 italic leading-relaxed">
            {res.specialRequests}
          </div>
        )}

        {/* Action */}
        {isSuccess ? (
          <div className="flex items-center justify-center gap-2 py-2.5 text-emerald-400 text-sm font-bold">
            <CheckCircle2 size={16} />
            {isTr ? "İşlem başarıyla tamamlandı!" : "Completed successfully!"}
          </div>
        ) : (
          <div className="flex gap-2">
            {canCheckin && (
              <button
                onClick={() => onCheckinRequest(res.confirmationId)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/10 hover:bg-emerald-500/18 border border-emerald-500/22 text-emerald-400 text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
              >
                <LogIn size={14} />
                {isTr ? "Check-in Yap" : "Check In"}
              </button>
            )}
            {canCheckout && (
              <button
                onClick={() => onCheckoutRequest(res.confirmationId)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-accent/10 hover:bg-brand-accent/18 border border-brand-accent/22 text-brand-accent text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
              >
                <LogOutIcon size={14} />
                {isTr ? "Check-out Yap" : "Check Out"}
              </button>
            )}
            {!canCheckin && !canCheckout && (
              <div className="flex-1 flex items-center justify-center gap-1.5 py-3 text-faint text-xs">
                <AlertCircle size={12} />
                {isTr
                  ? "Bu rezervasyon için işlem yapılamaz."
                  : "No action available."}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Check-in Confirm Modal ────────────────────────────────────────────────────

function CheckinConfirmModal({
  res,
  isTr,
  loading,
  docFile,
  docUrl,
  docUploading,
  docError,
  vehiclePlate,
  staffNote,
  onDocChange,
  onVehiclePlate,
  onStaffNote,
  onConfirm,
  onClose,
}: {
  res: Res;
  isTr: boolean;
  loading: boolean;
  docFile: File | null;
  docUrl: string | null;
  docUploading: boolean;
  docError: string | null;
  vehiclePlate: string;
  staffNote: string;
  onDocChange: (f: File | null) => void;
  onVehiclePlate: (v: string) => void;
  onStaffNote: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { mode } = useTheme();

  // ── Additional staying guests (required before check-in) ──────────────────
  const requiredAdults = Math.max(res.adultsCount - 1, 0);
  const requiredChildren = res.childrenCount;
  const needsGuests = requiredAdults + requiredChildren > 0;

  type GForm = { firstName: string; lastName: string; idType: 'tc' | 'passport'; tcKimlikNo: string; passportNo: string; birthDate: string; nationality: string };
  const blank = (): GForm => ({ firstName: '', lastName: '', idType: 'tc', tcKimlikNo: '', passportNo: '', birthDate: '', nationality: 'TR' });

  const [adults, setAdults] = useState<GForm[]>(() => Array.from({ length: requiredAdults }, blank));
  const [children, setChildren] = useState<GForm[]>(() => Array.from({ length: requiredChildren }, blank));
  const [guestError, setGuestError] = useState<string | null>(null);
  const [savingGuests, setSavingGuests] = useState(false);

  useEffect(() => {
    if (!needsGuests) return;
    let active = true;
    type SG = { isChild: boolean; firstName: string; lastName: string; birthDate: string | null; nationality: string | null; tcKimlikNo: string | null; passportNo: string | null };
    const toForm = (g: SG): GForm => ({
      firstName: g.firstName, lastName: g.lastName,
      idType: g.passportNo && !g.tcKimlikNo ? 'passport' : 'tc',
      tcKimlikNo: g.tcKimlikNo ?? '', passportNo: g.passportNo ?? '',
      birthDate: g.birthDate ? g.birthDate.split('T')[0] : '',
      nationality: g.nationality ?? 'TR',
    });
    fetch(`/api/reservations/${res.id}/guests`)
      .then(r => r.json())
      .then((d) => {
        if (!active || !d.ok) return;
        const a = (d.guests as SG[]).filter(g => !g.isChild);
        const c = (d.guests as SG[]).filter(g => g.isChild);
        setAdults(prev => prev.map((slot, i) => (a[i] ? toForm(a[i]) : slot)));
        setChildren(prev => prev.map((slot, i) => (c[i] ? toForm(c[i]) : slot)));
      })
      .catch(() => null);
    return () => { active = false; };
  }, [res.id, needsGuests]);

  const setAdult = (i: number, patch: Partial<GForm>) => setAdults(prev => prev.map((g, idx) => idx === i ? { ...g, ...patch } : g));
  const setChild = (i: number, patch: Partial<GForm>) => setChildren(prev => prev.map((g, idx) => idx === i ? { ...g, ...patch } : g));

  const adultsValid = adults.every(a => a.firstName.trim() && a.lastName.trim() && (a.idType === 'tc' ? /^\d{11}$/.test(a.tcKimlikNo) : a.passportNo.trim().length >= 3));
  const childrenValid = children.every(c => c.firstName.trim() && c.lastName.trim() && !!c.birthDate);
  const guestsComplete = !needsGuests || (adultsValid && childrenValid);

  async function handleConfirm() {
    if (needsGuests) {
      if (!guestsComplete) {
        setGuestError(isTr ? 'Lütfen tüm misafir bilgilerini eksiksiz doldurun.' : 'Please complete every guest.');
        return;
      }
      setSavingGuests(true);
      setGuestError(null);
      try {
        const payload = {
          guests: [
            ...adults.map(a => ({
              isChild: false, firstName: a.firstName.trim(), lastName: a.lastName.trim(), nationality: a.nationality || 'TR',
              tcKimlikNo: a.idType === 'tc' ? a.tcKimlikNo : null,
              passportNo: a.idType === 'passport' ? a.passportNo.trim().toUpperCase() : null,
            })),
            ...children.map(c => ({
              isChild: true, firstName: c.firstName.trim(), lastName: c.lastName.trim(), birthDate: c.birthDate, nationality: c.nationality || 'TR',
            })),
          ],
        };
        const resp = await fetch(`/api/reservations/${res.id}/guests`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        const d = await resp.json();
        if (!d.ok) { setGuestError(d.message || (isTr ? 'Misafir bilgileri kaydedilemedi.' : 'Could not save guests.')); setSavingGuests(false); return; }
      } catch {
        setGuestError(isTr ? 'Bağlantı hatası.' : 'Connection error.'); setSavingGuests(false); return;
      }
      setSavingGuests(false);
    }
    onConfirm();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onDocChange(f);
  }

  function pickFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png,.webp";
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) onDocChange(f);
    };
    input.click();
  }

  return createPortal(
    <div
      data-mode={mode}
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md modal-shell overflow-hidden"
      >
        {/* Header */}
        <div className="h-[3px] bg-gradient-to-r from-emerald-500 to-transparent" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-m-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <LogIn size={14} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-main">
                {isTr ? "Check-in Onayı" : "Confirm Check-in"}
              </p>
              <p className="text-[10px] text-subtle font-mono">{res.confirmationId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-m-hover flex items-center justify-center text-subtle hover:text-main transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Guest + room summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="surface-soft p-3">
              <p className="text-[9px] text-subtle uppercase tracking-wider mb-1">
                {isTr ? "Misafir" : "Guest"}
              </p>
              <p className="text-sm font-bold text-main leading-snug">
                {res.firstName} {res.lastName}
              </p>
              <p className="text-[10px] text-subtle mt-0.5 truncate">{res.phone}</p>
            </div>
            <div className="surface-soft p-3">
              <p className="text-[9px] text-subtle uppercase tracking-wider mb-1">
                {isTr ? "Oda" : "Room"}
              </p>
              <p className="text-sm font-bold text-main leading-snug">{res.room.name}</p>
              <p className="text-[10px] text-subtle mt-0.5 truncate">
                {res.room.roomType.name}
              </p>
            </div>
          </div>

          {/* Additional guests (required) */}
          {needsGuests && (
            <div>
              <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1.5">
                <Users size={11} />
                {isTr ? "Diğer Misafirler" : "Additional Guests"}{" "}
                <span className="text-red-400 normal-case font-normal">({isTr ? "zorunlu" : "required"})</span>
              </p>
              <p className="text-[10px] text-subtle mb-2.5 leading-relaxed">
                {isTr
                  ? `Bu odada toplam ${res.adultsCount} yetişkin${res.childrenCount > 0 ? ` + ${res.childrenCount} çocuk` : ""} konaklayacak. Lider misafir dışındaki herkesin bilgisi girilmeden check-in yapılamaz.`
                  : `${res.adultsCount} adult${res.childrenCount > 0 ? ` + ${res.childrenCount} children` : ""} will stay in this room. Check-in is blocked until every guest beyond the lead is recorded.`}
              </p>
              <div className="space-y-2.5">
                {adults.map((g, i) => (
                  <div key={`a${i}`} className="surface-soft p-3 space-y-2">
                    <p className="text-[10px] font-bold text-main">{isTr ? `Yetişkin ${i + 2}` : `Adult ${i + 2}`}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input value={g.firstName} onChange={(e) => setAdult(i, { firstName: e.target.value })} placeholder={isTr ? "Ad" : "First name"} className="control-base px-2.5 py-1.5 text-xs" />
                      <input value={g.lastName} onChange={(e) => setAdult(i, { lastName: e.target.value })} placeholder={isTr ? "Soyad" : "Last name"} className="control-base px-2.5 py-1.5 text-xs" />
                    </div>
                    <div className="flex gap-2">
                      <select value={g.idType} onChange={(e) => setAdult(i, { idType: e.target.value as "tc" | "passport" })} className="control-base px-2 py-1.5 text-xs w-28 appearance-none">
                        <option value="tc">{isTr ? "T.C. No" : "TC No"}</option>
                        <option value="passport">{isTr ? "Pasaport" : "Passport"}</option>
                      </select>
                      {g.idType === "tc" ? (
                        <input value={g.tcKimlikNo} onChange={(e) => setAdult(i, { tcKimlikNo: e.target.value.replace(/\D/g, "").slice(0, 11) })} inputMode="numeric" placeholder={isTr ? "11 haneli kimlik no" : "11-digit ID"} className="control-base px-2.5 py-1.5 text-xs flex-1 font-mono tracking-wider" />
                      ) : (
                        <input value={g.passportNo} onChange={(e) => setAdult(i, { passportNo: e.target.value.toUpperCase() })} placeholder={isTr ? "Pasaport No" : "Passport No"} className="control-base px-2.5 py-1.5 text-xs flex-1 font-mono tracking-wider" />
                      )}
                    </div>
                  </div>
                ))}
                {children.map((g, i) => (
                  <div key={`c${i}`} className="surface-soft p-3 space-y-2">
                    <p className="text-[10px] font-bold text-main">{isTr ? `Çocuk ${i + 1}` : `Child ${i + 1}`}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={g.firstName} onChange={(e) => setChild(i, { firstName: e.target.value })} placeholder={isTr ? "Ad" : "First name"} className="control-base px-2.5 py-1.5 text-xs" />
                      <input value={g.lastName} onChange={(e) => setChild(i, { lastName: e.target.value })} placeholder={isTr ? "Soyad" : "Last name"} className="control-base px-2.5 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="text-[9px] text-subtle uppercase tracking-wider">{isTr ? "Doğum Tarihi" : "Birth date"}</label>
                      <input type="date" value={g.birthDate} onChange={(e) => setChild(i, { birthDate: e.target.value })} className="control-base px-2.5 py-1.5 text-xs w-full mt-0.5" />
                    </div>
                  </div>
                ))}
              </div>
              {guestError && <p className="text-[10px] text-red-400 mt-2">{guestError}</p>}
            </div>
          )}

          {/* Document upload */}
          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-2">
              {isTr ? "Kimlik Belgesi" : "ID Document"}{" "}
              <span className="text-subtle normal-case font-normal">
                ({isTr ? "opsiyonel" : "optional"})
              </span>
            </p>
            {docUrl ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-400 flex-1">
                  {isTr ? "Belge yüklendi" : "Document uploaded"}
                </p>
                <button
                  onClick={() => onDocChange(null)}
                  className="text-subtle hover:text-main transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ) : docFile ? (
              <div className="surface-soft flex items-center gap-2 px-3 py-2.5">
                <FileText size={14} className="text-subtle shrink-0" />
                <p className="text-xs text-muted flex-1 truncate">{docFile.name}</p>
                <button
                  onClick={() => onDocChange(null)}
                  className="text-subtle hover:text-main transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={pickFile}
                className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl border border-dashed border-m-border hover:border-m-border2 hover:bg-m-hover cursor-pointer transition-all text-center"
              >
                <div className="w-9 h-9 rounded-xl surface-soft flex items-center justify-center">
                  <Upload size={15} className="text-subtle" />
                </div>
                <div>
                  <p className="text-xs text-muted">
                    {isTr ? "Dosya seçin veya buraya bırakın" : "Click or drop file here"}
                  </p>
                  <p className="text-[10px] text-subtle mt-0.5">
                    PDF, JPG, PNG · maks. 10 MB
                  </p>
                </div>
              </div>
            )}
            {docError && (
              <p className="text-[10px] text-red-400 mt-1.5">{docError}</p>
            )}
          </div>

          {/* Vehicle plate */}
          <div>
            <label className="text-[10px] text-muted uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-1.5">
              <Car size={11} />
              {isTr ? "Araç Plakası" : "Vehicle Plate"}{" "}
              <span className="text-subtle normal-case font-normal">
                ({isTr ? "opsiyonel" : "optional"})
              </span>
            </label>
            <input
              value={vehiclePlate}
              onChange={(e) => onVehiclePlate(e.target.value.toUpperCase())}
              placeholder="34 ABC 1234"
              className="control-base px-3 py-2 text-sm font-mono tracking-widest"
            />
          </div>

          {/* Staff note */}
          <div>
            <label className="text-[10px] text-muted uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-1.5">
              <StickyNote size={11} />
              {isTr ? "Personel Notu" : "Staff Note"}{" "}
              <span className="text-subtle normal-case font-normal">
                ({isTr ? "opsiyonel" : "optional"})
              </span>
            </label>
            <textarea
              value={staffNote}
              onChange={(e) => onStaffNote(e.target.value)}
              rows={2}
              placeholder={
                isTr
                  ? "Özel talep, gözlem veya not…"
                  : "Special request, observation or note…"
              }
              className="control-base px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="btn-secondary flex-1 py-2.5 text-sm"
            >
              {isTr ? "İptal" : "Cancel"}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || docUploading || savingGuests || (needsGuests && !guestsComplete)}
              className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/12 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 text-sm font-bold transition-colors disabled:opacity-40"
            >
              {loading || docUploading || savingGuests ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <LogIn size={13} />
              )}
              {isTr ? "Check-in'i Tamamla" : "Complete Check-in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

// ── Check-out Confirm Modal ───────────────────────────────────────────────────

function CheckoutConfirmModal({
  res,
  isTr,
  loading,
  sendToCleaning,
  onToggleCleaning,
  staffNote,
  onStaffNote,
  onConfirm,
  onClose,
}: {
  res: Res;
  isTr: boolean;
  loading: boolean;
  sendToCleaning: boolean;
  onToggleCleaning: () => void;
  staffNote: string;
  onStaffNote: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { mode } = useTheme();

  return createPortal(
    <div
      data-mode={mode}
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md modal-shell overflow-hidden"
      >
        {/* Header */}
        <div className="h-[3px] bg-gradient-to-r from-brand-accent to-transparent" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-m-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
              <LogOutIcon size={14} className="text-brand-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-main">
                {isTr ? "Check-out Onayı" : "Confirm Check-out"}
              </p>
              <p className="text-[10px] text-subtle font-mono">{res.confirmationId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-m-hover flex items-center justify-center text-subtle hover:text-main transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Guest + room summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="surface-soft p-3">
              <p className="text-[9px] text-subtle uppercase tracking-wider mb-1">
                {isTr ? "Misafir" : "Guest"}
              </p>
              <p className="text-sm font-bold text-main leading-snug">
                {res.firstName} {res.lastName}
              </p>
              <p className="text-[10px] text-subtle mt-0.5 truncate">{res.phone}</p>
            </div>
            <div className="surface-soft p-3">
              <p className="text-[9px] text-subtle uppercase tracking-wider mb-1">
                {isTr ? "Oda" : "Room"}
              </p>
              <p className="text-sm font-bold text-main leading-snug">{res.room.name}</p>
              <p className="text-[10px] text-subtle mt-0.5 truncate">
                {res.room.roomType.name}
              </p>
            </div>
          </div>

          {/* Cleaning toggle */}
          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-3">
              {isTr ? "Oda Temizliğe Gönderilsin mi?" : "Send Room to Cleaning?"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { if (!sendToCleaning) onToggleCleaning(); }}
                className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                  sendToCleaning
                    ? "bg-brand-accent/15 border-brand-accent/35 text-brand-accent"
                    : "bg-m-surface border-m-border text-subtle hover:bg-m-hover"
                }`}
              >
                {isTr ? "Evet" : "Yes"}
              </button>
              <button
                onClick={() => { if (sendToCleaning) onToggleCleaning(); }}
                className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                  !sendToCleaning
                    ? "bg-m-surface2 border-m-border2 text-main"
                    : "bg-m-surface border-m-border text-subtle hover:bg-m-hover"
                }`}
              >
                {isTr ? "Hayır" : "No"}
              </button>
            </div>
          </div>

          {/* Staff note */}
          <div>
            <label className="text-[10px] text-muted uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-1.5">
              <StickyNote size={11} />
              {isTr ? "Personel Notu" : "Staff Note"}{" "}
              <span className="text-subtle normal-case font-normal">
                ({isTr ? "opsiyonel" : "optional"})
              </span>
            </label>
            <textarea
              value={staffNote}
              onChange={(e) => onStaffNote(e.target.value)}
              rows={2}
              placeholder={
                isTr ? "Check-out notu veya gözlem…" : "Check-out note or observation…"
              }
              className="control-base px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="btn-secondary flex-1 py-2.5 text-sm"
            >
              {isTr ? "İptal" : "Cancel"}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-accent/12 hover:bg-brand-accent/20 border border-brand-accent/25 text-brand-accent text-sm font-bold transition-colors disabled:opacity-40"
            >
              {loading ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <LogOutIcon size={13} />
              )}
              {isTr ? "Check-out'u Tamamla" : "Complete Check-out"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

// ── Guest Row ─────────────────────────────────────────────────────────────────

function GuestRow({
  res,
  isArrival,
  onCheckinRequest,
  onCheckoutRequest,
  loading,
  isTr,
  successId,
  isSelected,
  onSelect,
}: {
  res: Res;
  isArrival: boolean;
  onCheckinRequest: (confirmationId: string) => void;
  onCheckoutRequest: (confirmationId: string) => void;
  loading: boolean;
  isTr: boolean;
  successId: string | null;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isSuccess = successId === res.confirmationId;

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl border cursor-pointer transition-all ${
        isSelected
          ? "bg-m-surface2 border-m-border2"
          : "border-transparent hover:bg-m-hover hover:border-m-border"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
          isArrival
            ? "bg-emerald-500/8 border-emerald-500/15"
            : "bg-brand-accent/8 border-brand-accent/15"
        }`}
      >
        <BedDouble
          size={13}
          className={isArrival ? "text-emerald-400" : "text-brand-accent"}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-bold text-main truncate">
            {res.room.name}
          </p>
          <StatusBadge status={res.status} isTr={isTr} />
        </div>
        <p className="text-xs text-subtle truncate mt-0.5">
          {res.firstName} {res.lastName}
          <span className="mx-1 text-faint">·</span>
          <span className="font-mono">{res.confirmationId}</span>
          {res.specialRequests && (
            <span className="ml-1.5 text-amber-400/50">★</span>
          )}
        </p>
      </div>

      {isSuccess ? (
        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isArrival) onCheckinRequest(res.confirmationId);
            else onCheckoutRequest(res.confirmationId);
          }}
          disabled={loading}
          className={`shrink-0 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors disabled:opacity-40 ${
            isArrival
              ? "bg-emerald-500/8 hover:bg-emerald-500/18 border-emerald-500/18 text-emerald-400"
              : "bg-brand-accent/8 hover:bg-brand-accent/18 border-brand-accent/18 text-brand-accent"
          }`}
        >
          {isArrival
            ? isTr
              ? "Giriş"
              : "Check in"
            : isTr
              ? "Çıkış"
              : "Check out"}
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CheckinPanel({ tr: isTr }: { tr: boolean }) {
  const [code, setCode] = useState("");
  const [found, setFound] = useState<Res | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [listTab, setListTab] = useState<"arrivals" | "departures">("arrivals");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [arrivals, setArrivals] = useState<Res[]>([]);
  const [departures, setDepartures] = useState<Res[]>([]);
  const [upcoming, setUpcoming] = useState({ arrivals: 0, departures: 0, inHouse: 0 });
  const [loadingToday, setLoadingToday] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [checkInTime,  setCheckInTime]  = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("12:00");

  // ── Check-out confirmation modal ──
  const [showCheckoutModal,  setShowCheckoutModal]  = useState(false);
  const [pendingCheckoutId,  setPendingCheckoutId]  = useState<string | null>(null);
  const [checkoutCleaning,   setCheckoutCleaning]   = useState(true);
  const [checkoutNote,       setCheckoutNote]       = useState('');

  // ── Check-in confirmation modal ──
  const [showCheckinModal,    setShowCheckinModal]    = useState(false);
  const [pendingCheckinId,    setPendingCheckinId]    = useState<string | null>(null);
  const [modalVehiclePlate,   setModalVehiclePlate]   = useState("");
  const [modalStaffNote,      setModalStaffNote]      = useState("");
  const [modalDocFile,        setModalDocFile]        = useState<File | null>(null);
  const [modalDocUrl,         setModalDocUrl]         = useState<string | null>(null);
  const [modalDocUploading,   setModalDocUploading]   = useState(false);
  const [modalDocError,       setModalDocError]       = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings/checkin-times")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) { setCheckInTime(data.checkInTime); setCheckOutTime(data.checkOutTime); }
      })
      .catch(() => undefined);
  }, []);

  // Live clock
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const fetchToday = useCallback(async () => {
    setLoadingToday(true);
    try {
      const res = await fetch("/api/checkin?today=true");
      const data = await res.json();
      if (data.ok) {
        setArrivals(data.arrivals);
        setDepartures(data.departures);
        setUpcoming({
          arrivals: data.upcomingArrivals ?? 0,
          departures: data.upcomingDepartures ?? 0,
          inHouse: data.inHouse ?? 0,
        });
      }
    } finally {
      setLoadingToday(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  // Core search — accepts explicit code so QR scanner can pass directly
  const executeSearch = useCallback(
    async (c: string) => {
      setSearching(true);
      setSearchError(null);
      setFound(null);
      setSelectedId(null);
      try {
        const res = await fetch(`/api/checkin?code=${encodeURIComponent(c)}`);
        const data = await res.json();
        if (data.ok) {
          setFound(data.reservation);
        } else {
          setSearchError(
            data.message ?? (isTr ? "Rezervasyon bulunamadı." : "Not found."),
          );
        }
      } catch {
        setSearchError(isTr ? "Bağlantı hatası." : "Connection error.");
      } finally {
        setSearching(false);
      }
    },
    [isTr],
  );

  const handleSearch = useCallback(() => {
    const c = code.trim();
    if (c) executeSearch(c);
  }, [code, executeSearch]);

  const handleQRCode = useCallback(
    (qrCode: string) => {
      setShowQR(false);
      setCode(qrCode);
      executeSearch(qrCode);
    },
    [executeSearch],
  );

  const handleAction = useCallback(
    async (
      confirmationId: string,
      action: "checkin" | "checkout",
      extras?: { vehiclePlate?: string; checkinNote?: string; checkinDocumentUrl?: string; sendToCleaning?: boolean; checkoutNote?: string },
    ) => {
      setActionLoading(true);
      try {
        const res = await fetch("/api/checkin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmationId, action, ...extras }),
        });
        const data = await res.json();
        if (data.ok) {
          setSuccessId(confirmationId);
          if (found?.confirmationId === confirmationId)
            setFound(data.reservation);
          await fetchToday();
          setTimeout(() => {
            setSuccessId(null);
            if (found?.confirmationId === confirmationId) {
              setFound(null);
              setCode("");
              setSelectedId(null);
              inputRef.current?.focus();
            }
          }, 2500);
        } else {
          alert(data.message ?? (isTr ? "Hata oluştu." : "An error occurred."));
        }
      } catch {
        alert(isTr ? "Bağlantı hatası." : "Connection error.");
      } finally {
        setActionLoading(false);
      }
    },
    [found, fetchToday, isTr],
  );

  const handleCheckoutRequest = useCallback((confirmationId: string) => {
    setPendingCheckoutId(confirmationId);
    setCheckoutCleaning(true);
    setCheckoutNote('');
    setShowCheckoutModal(true);
  }, []);

  const handleCheckoutConfirm = useCallback(async () => {
    if (!pendingCheckoutId) return;
    setShowCheckoutModal(false);
    await handleAction(pendingCheckoutId, 'checkout', {
      sendToCleaning: checkoutCleaning,
      checkoutNote:   checkoutNote || undefined,
    });
    setPendingCheckoutId(null);
  }, [pendingCheckoutId, checkoutCleaning, checkoutNote, handleAction]);

  const handleCheckinRequest = useCallback((confirmationId: string) => {
    setPendingCheckinId(confirmationId);
    setModalVehiclePlate("");
    setModalStaffNote("");
    setModalDocFile(null);
    setModalDocUrl(null);
    setModalDocError(null);
    setShowCheckinModal(true);
  }, []);

  const handleCheckinConfirm = useCallback(async () => {
    if (!pendingCheckinId) return;
    if (modalDocFile && !modalDocUrl) {
      setModalDocUploading(true);
      const fd = new FormData();
      fd.append("file", modalDocFile);
      fd.append("confirmationId", pendingCheckinId);
      try {
        const r = await fetch("/api/checkin/document", { method: "POST", body: fd });
        const d = await r.json();
        if (d.ok) {
          setModalDocUrl(d.fileName ?? modalDocFile.name);
        } else {
          setModalDocError(d.message ?? (isTr ? "Belge yüklenemedi." : "Upload failed."));
          setModalDocUploading(false);
          return;
        }
      } catch {
        setModalDocError(isTr ? "Yükleme hatası." : "Upload error.");
        setModalDocUploading(false);
        return;
      }
      setModalDocUploading(false);
    }

    setShowCheckinModal(false);
    await handleAction(pendingCheckinId, "checkin", {
      vehiclePlate:       modalVehiclePlate || undefined,
      checkinNote:        modalStaffNote    || undefined,
    });
    setPendingCheckinId(null);
  }, [
    pendingCheckinId, modalDocFile, modalDocUrl, modalVehiclePlate,
    modalStaffNote, handleAction, isTr,
  ]);

  const timeStr = time.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const secStr = time
    .toLocaleTimeString("tr-TR", { second: "2-digit" })
    .replace(/^.*:/, "");
  const dateStr = time.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const listItems = listTab === "arrivals" ? arrivals : departures;

  return (
    <div className="space-y-5 max-w-6xl">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
            <DoorOpen size={18} className="text-brand-accent" />
          </div>
          <div>
            <h2 className="text-base font-bold text-main leading-none">
              {isTr
                ? "Giriş / Çıkış Terminali"
                : "Check-in / Check-out Terminal"}
            </h2>
            <p className="text-[11px] text-subtle mt-0.5 capitalize">
              {dateStr}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-mono text-xl font-black text-brand-accent leading-none tabular-nums">
              {timeStr}
            </p>
            <p className="font-mono text-xs text-subtle tabular-nums">
              :{secStr}
            </p>
          </div>
          <button
            onClick={fetchToday}
            className="w-9 h-9 rounded-xl border border-m-border hover:bg-m-hover flex items-center justify-center text-subtle hover:text-main transition-colors"
            title={isTr ? "Yenile" : "Refresh"}
          >
            <RefreshCw
              size={13}
              className={loadingToday ? "animate-spin text-brand-accent" : ""}
            />
          </button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          {
            label: isTr ? "Bugün Beklenen" : "Expected Today",
            value: arrivals.length,
            cls: "text-emerald-400",
            bg: "bg-emerald-400/5 border-emerald-400/12",
          },
          {
            label: isTr ? "Onay Bekliyor" : "Pending",
            value: arrivals.filter((r) => r.status === "pending").length,
            cls: "text-amber-400",
            bg: "bg-amber-400/5 border-amber-400/12",
          },
          {
            label: isTr ? "Bugün Çıkış" : "Departures Today",
            value: departures.length,
            cls: "text-brand-accent",
            bg: "bg-brand-accent/5 border-brand-accent/12",
          },
          {
            label: isTr ? "Onaylı Giriş" : "Confirmed Arrivals",
            value: arrivals.filter((r) => r.status === "confirmed").length,
            cls: "text-sky-400",
            bg: "bg-sky-400/5 border-sky-400/12",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border px-3 py-2.5 ${s.bg}`}>
            <p className={`text-xl font-black tabular-nums ${s.cls}`}>
              {s.value}
            </p>
            <p className="text-[10px] text-subtle mt-0.5 leading-tight">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Wider outlook (in-house + upcoming totals) ── */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: isTr ? "Otelde Misafir" : "In House", value: upcoming.inHouse, cls: "text-sky-400" },
          { label: isTr ? "Yaklaşan Giriş" : "Upcoming Arrivals", value: upcoming.arrivals, cls: "text-emerald-400" },
          { label: isTr ? "Yaklaşan Çıkış" : "Upcoming Departures", value: upcoming.departures, cls: "text-brand-accent" },
        ].map((s) => (
          <div key={s.label} className="surface-card px-3 py-2.5">
            <p className={`text-lg font-black tabular-nums ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] text-subtle mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* ══ LEFT: input station ══ */}
        <div className="lg:col-span-2 space-y-3">
          {/* Code input card */}
          <div className="surface-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Hash size={12} className="text-brand-accent" />
              <p className="text-[10px] text-subtle uppercase tracking-widest font-semibold">
                {isTr ? "Rezervasyon Kodu Gir" : "Enter Reservation Code"}
              </p>
            </div>

            {/* Big code input */}
            <div className="relative">
              <input
                ref={inputRef}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 8));
                  setSearchError(null);
                  if (found) {
                    setFound(null);
                    setSelectedId(null);
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="00000000"
                className="control-base px-5 py-5 font-mono text-[2.2rem] font-black text-main text-center tracking-[0.3em]"
                maxLength={8}
                inputMode="numeric"
              />
              {code.length > 0 && (
                <button
                  onClick={() => {
                    setCode("");
                    setFound(null);
                    setSearchError(null);
                    setSelectedId(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg hover:bg-m-hover flex items-center justify-center text-subtle hover:text-main transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-150 ${
                    i < code.length
                      ? "w-4 h-1.5 bg-brand-accent"
                      : "w-1.5 h-1.5 bg-m-surface2"
                  }`}
                />
              ))}
            </div>

            {/* Search button */}
            <button
              onClick={handleSearch}
              disabled={searching || code.length !== 8}
              className="w-full py-3.5 rounded-xl bg-brand-accent text-black font-black text-sm tracking-wide disabled:opacity-25 disabled:cursor-not-allowed hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              {searching ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <>
                  <ArrowRight size={14} />
                  {isTr ? "Rezervasyonu Getir" : "Find Reservation"}
                </>
              )}
            </button>

            {/* Error */}
            <AnimatePresence>
              {searchError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/8 border border-red-500/15 text-red-400 text-xs"
                >
                  <AlertCircle size={12} className="shrink-0" />
                  {searchError}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* QR scan button */}
          <button
            onClick={() => setShowQR(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-m-border bg-m-surface hover:bg-m-hover hover:border-m-border2 text-muted hover:text-main text-sm font-semibold transition-all group"
          >
            <div className="w-8 h-8 rounded-lg surface-soft flex items-center justify-center shrink-0 group-hover:bg-brand-accent/10 group-hover:border-brand-accent/20 transition-colors">
              <Camera
                size={14}
                className="group-hover:text-brand-accent transition-colors"
              />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-muted group-hover:text-main transition-colors">
                {isTr ? "Kamera ile QR Tara" : "Scan QR via Camera"}
              </p>
              <p className="text-[10px] text-subtle mt-0.5">
                {isTr
                  ? "Misafirin telefonunu kameraya gösterin"
                  : "Point camera at guest's phone"}
              </p>
            </div>
            <QrCode
              size={15}
              className="text-subtle group-hover:text-brand-accent/70 transition-colors shrink-0"
            />
          </button>

          {/* Detail card */}
          <AnimatePresence mode="wait">
            {found && (
              <DetailCard
                key={found.id}
                res={found}
                onClose={() => {
                  setFound(null);
                  setCode("");
                  setSelectedId(null);
                  inputRef.current?.focus();
                }}
                onCheckinRequest={handleCheckinRequest}
                onCheckoutRequest={handleCheckoutRequest}
                loading={actionLoading}
                isTr={isTr}
                successId={successId}
                checkInTime={checkInTime}
                checkOutTime={checkOutTime}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ══ RIGHT: today's list ══ */}
        <div
          className="lg:col-span-3 surface-card overflow-hidden flex flex-col"
          style={{ minHeight: 420 }}
        >
          {/* Tab bar */}
          <div className="flex border-b border-m-border shrink-0">
            {[
              {
                id: "arrivals" as const,
                label: isTr ? "Bugünkü Gelenler" : "Today's Arrivals",
                count: arrivals.length,
                dot: "bg-emerald-400",
              },
              {
                id: "departures" as const,
                label: isTr ? "Bugünkü Gidenler" : "Today's Departures",
                count: departures.length,
                dot: "bg-brand-accent",
              },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setListTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold border-b-2 transition-colors ${
                  listTab === t.id
                    ? "border-brand-accent text-main bg-m-surface2"
                    : "border-transparent text-subtle hover:text-main"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                {t.label}
                <span className="px-1.5 py-0.5 rounded-full bg-m-surface2 text-subtle text-[10px] font-mono min-w-[1.5rem] text-center">
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3">
            {loadingToday ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw size={20} className="animate-spin text-faint" />
                <p className="text-xs text-subtle">
                  {isTr ? "Yükleniyor…" : "Loading…"}
                </p>
              </div>
            ) : listItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl surface-soft flex items-center justify-center">
                  {listTab === "arrivals" ? (
                    <Users size={22} className="text-faint" />
                  ) : (
                    <LogOutIcon size={22} className="text-faint" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-subtle">
                    {isTr
                      ? listTab === "arrivals"
                        ? "Bugün beklenen misafir yok"
                        : "Bugün çıkış yapacak misafir yok"
                      : listTab === "arrivals"
                        ? "No arrivals expected today"
                        : "No departures today"}
                  </p>
                  <p className="text-xs text-faint mt-1">
                    {isTr
                      ? "Yeni rezervasyonlar burada görünecek"
                      : "New reservations will appear here"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {listItems.map((r) => (
                  <GuestRow
                    key={r.id}
                    res={r}
                    isArrival={listTab === "arrivals"}
                    onCheckinRequest={handleCheckinRequest}
                    onCheckoutRequest={handleCheckoutRequest}
                    loading={actionLoading}
                    isTr={isTr}
                    successId={successId}
                    isSelected={selectedId === r.id}
                    onSelect={() => {
                      if (selectedId === r.id) {
                        setSelectedId(null);
                        setFound(null);
                        setCode("");
                      } else {
                        setSelectedId(r.id);
                        setFound(r);
                        setCode(r.confirmationId);
                        setSearchError(null);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR modal */}
      <AnimatePresence>
        {showQR && (
          <QRScannerModal
            onCode={handleQRCode}
            onClose={() => setShowQR(false)}
            isTr={isTr}
          />
        )}
      </AnimatePresence>

      {/* Check-out confirmation modal */}
      <AnimatePresence>
        {showCheckoutModal && pendingCheckoutId && (() => {
          const res = found
            ?? arrivals.find(r => r.confirmationId === pendingCheckoutId)
            ?? departures.find(r => r.confirmationId === pendingCheckoutId);
          if (!res) return null;
          return (
            <CheckoutConfirmModal
              res={res}
              isTr={isTr}
              loading={actionLoading}
              sendToCleaning={checkoutCleaning}
              onToggleCleaning={() => setCheckoutCleaning(p => !p)}
              staffNote={checkoutNote}
              onStaffNote={setCheckoutNote}
              onConfirm={handleCheckoutConfirm}
              onClose={() => { setShowCheckoutModal(false); setPendingCheckoutId(null); }}
            />
          );
        })()}
      </AnimatePresence>

      {/* Check-in confirmation modal */}
      <AnimatePresence>
        {showCheckinModal && pendingCheckinId && (() => {
          const res = found ?? arrivals.find(r => r.confirmationId === pendingCheckinId) ?? departures.find(r => r.confirmationId === pendingCheckinId);
          if (!res) return null;
          return (
            <CheckinConfirmModal
              res={res}
              isTr={isTr}
              loading={actionLoading}
              docFile={modalDocFile}
              docUrl={modalDocUrl}
              docUploading={modalDocUploading}
              docError={modalDocError}
              vehiclePlate={modalVehiclePlate}
              staffNote={modalStaffNote}
              onDocChange={(f) => { setModalDocFile(f); if (!f) setModalDocUrl(null); setModalDocError(null); }}
              onVehiclePlate={setModalVehiclePlate}
              onStaffNote={setModalStaffNote}
              onConfirm={handleCheckinConfirm}
              onClose={() => { setShowCheckinModal(false); setPendingCheckinId(null); }}
            />
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
