"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera, CameraOff, Keyboard, ScanLine,
  CheckCircle2, XCircle, AlertTriangle, Clock, Dumbbell,
  User, CalendarDays, MapPin, ChevronRight,
} from "lucide-react";
import { initials, formatDate } from "@/lib/utils";

interface Branch { id: string; name: string }

interface ScanResultMembership {
  type: "membership";
  status: "active" | "expired";
  todayAlreadyCheckedIn: boolean;
  member: {
    id: string; memberNo: string; name: string; email: string;
    phone: string | null; avatarUrl: string | null;
    activePlan: { name: string; endDate: string } | null;
  };
}

interface ScanResultLesson {
  type: "lesson";
  status: "ok" | "already_used" | "cancelled" | "too_early";
  usedAt?: string;
  opensAt?: string;
  booking: {
    id: string; status: string; bookedAt: string; usedAt: string | null;
    member: { id: string; memberNo: string; name: string; avatarUrl: string | null; hasActiveMembership: boolean };
    lesson: { id: string; title: string; startAt: string; durationMin: number; location: string | null; trainerName: string | null };
  };
}

interface ScanResultNotFound { type: "not_found" }

type ScanResult = ScanResultMembership | ScanResultLesson | ScanResultNotFound;

interface FeedItem {
  id: number;
  type: "success" | "warning" | "error";
  name: string;
  message: string;
  time: string;
}

export function QrScanner({ branches }: { branches: Branch[] }) {
  const [mode, setMode]               = useState<"camera" | "manual">("camera");
  const [branchId, setBranchId]       = useState(branches[0]?.id ?? "");
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode]   = useState("");
  const [processing, setProcessing]   = useState(false);
  const [popup, setPopup]             = useState<{ result: ScanResult; code: string } | null>(null);
  const [feed, setFeed]               = useState<FeedItem[]>([]);
  const feedCounter                   = useRef(0);

  const videoRef        = useRef<HTMLVideoElement>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const animFrameRef    = useRef<number>(0);
  const lastScanned     = useRef<string>("");
  const lastScannedAt   = useRef<number>(0);
  const barcodeDetector = useRef<unknown>(null);
  const popupTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addFeed = useCallback((type: FeedItem["type"], name: string, message: string) => {
    const item: FeedItem = {
      id: ++feedCounter.current,
      type, name, message,
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    };
    setFeed((p) => [item, ...p].slice(0, 8));
  }, []);

  const showPopup = useCallback((result: ScanResult, code: string) => {
    setPopup({ result, code });
    if (popupTimer.current) clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => setPopup(null), 8000);
  }, []);

  const scan = useCallback(async (code: string, confirm = false) => {
    if (processing) return;
    if (!confirm) {
      const now = Date.now();
      if (code === lastScanned.current && now - lastScannedAt.current < 5000) return;
      lastScanned.current = code;
      lastScannedAt.current = now;
    }

    setProcessing(true);
    try {
      const res  = await fetch("/api/qr/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, confirm }),
      });
      const data: ScanResult = await res.json();
      showPopup(data, code);

      if (data.type === "not_found") {
        addFeed("error", "—", "QR tanınamadı");
      } else if (data.type === "membership") {
        if (data.status === "expired") {
          addFeed("error", data.member.name, "Üyelik süresi dolmuş");
        } else if (data.todayAlreadyCheckedIn && !confirm) {
          addFeed("warning", data.member.name, "Bugün zaten check-in yaptı");
        } else {
          addFeed("success", data.member.name, "Check-in başarılı");
        }
      } else if (data.type === "lesson") {
        const lessonTitle = data.booking.lesson.title;
        if (data.status === "too_early") {
          addFeed("warning", data.booking.member.name, `${lessonTitle} — giriş henüz açılmadı`);
        } else if (data.status === "already_used") {
          addFeed("warning", data.booking.member.name, `${lessonTitle} — daha önce giriş yapılmış`);
        } else if (data.status === "cancelled") {
          addFeed("error", data.booking.member.name, "İptal edilmiş kayıt");
        } else {
          addFeed("success", data.booking.member.name, `${lessonTitle} yoklaması alındı`);
        }
      }
    } catch {
      addFeed("error", "—", "Bağlantı hatası");
    } finally {
      setProcessing(false);
    }
  }, [processing, addFeed, showPopup]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      // @ts-ignore
      if ("BarcodeDetector" in window) barcodeDetector.current = new BarcodeDetector({ formats: ["qr_code"] });
      setCameraActive(true);
    } catch {
      alert("Kamera erişimi reddedildi. Manuel moda geçiliyor.");
      setMode("manual");
    }
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (!cameraActive || !barcodeDetector.current || !videoRef.current) return;
    let active = true;
    async function loop() {
      if (!active) return;
      try {
        // @ts-ignore
        const barcodes = await barcodeDetector.current.detect(videoRef.current);
        if (barcodes?.length > 0) await scan(barcodes[0].rawValue);
      } catch { /**/ }
      if (active) animFrameRef.current = requestAnimationFrame(loop);
    }
    animFrameRef.current = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(animFrameRef.current); };
  }, [cameraActive, scan]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await scan(manualCode.trim());
    setManualCode("");
  }

  const FEED_STYLE = {
    success: "bg-emerald-500/10 border-emerald-500/25 text-emerald-300",
    warning: "bg-amber-500/10  border-amber-500/25  text-amber-300",
    error:   "bg-rose-500/10   border-rose-500/25   text-rose-300",
  };
  const FEED_ICON = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    error:   <XCircle className="w-4 h-4 text-rose-400 shrink-0" />,
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">QR Tarayıcı</h1>
        <p className="text-sm text-label mt-1">Üyelik ve ders bileti okuma</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {branches.length > 1 && (
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input flex-1 text-sm">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <div className="flex gap-2 ml-auto">
          {(["camera", "manual"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`btn-md px-3 rounded-xl transition-colors ${mode === m ? "bg-neon text-ink-950" : "btn-secondary"}`}>
              {m === "camera" ? <Camera className="w-4 h-4" /> : <Keyboard className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* Camera */}
      {mode === "camera" && (
        <div className="card-surface p-4 space-y-3">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted">
                <CameraOff className="w-10 h-10" />
                <span className="text-sm">Kamera kapalı</span>
              </div>
            )}
            {cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2/3 h-2/3 border-2 border-neon/60 rounded-2xl" />
                <ScanLine className="absolute w-2/3 text-neon/60 animate-pulse" />
              </div>
            )}
            {processing && <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-neon animate-ping" />}
          </div>
          {!cameraActive
            ? <button onClick={startCamera} className="btn-primary btn-md w-full"><Camera className="w-4 h-4" />Kamerayı Başlat</button>
            : <button onClick={stopCamera}  className="btn-secondary btn-md w-full"><CameraOff className="w-4 h-4" />Durdur</button>
          }
        </div>
      )}

      {/* Manual */}
      {mode === "manual" && (
        <div className="card-surface p-4">
          <form onSubmit={handleManualSubmit} className="flex gap-3">
            <input className="input flex-1" placeholder="QR kodu girin…" value={manualCode}
              onChange={(e) => setManualCode(e.target.value)} autoFocus />
            <button type="submit" disabled={processing} className="btn-primary btn-md px-5">
              {processing ? "…" : "Ara"}
            </button>
          </form>
        </div>
      )}

      {/* Recent feed */}
      {feed.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-muted font-semibold uppercase tracking-wider">Son İşlemler</div>
          {feed.map((f) => (
            <div key={f.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${FEED_STYLE[f.type]}`}>
              {FEED_ICON[f.type]}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{f.name}</span>
                <span className="text-xs ml-2 opacity-70">{f.message}</span>
              </div>
              <span className="text-xs font-mono opacity-50 shrink-0">{f.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* Result popup */}
      {popup && (
        <ScanPopup
          result={popup.result}
          onClose={() => setPopup(null)}
          onConfirm={() => { const c = popup.code; setPopup(null); scan(c, true); }}
        />
      )}
    </div>
  );
}

// ---- Popup ----

function ScanPopup({
  result, onClose, onConfirm,
}: {
  result: ScanResult;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (result.type === "not_found") {
    return (
      <Popup onClose={onClose} color="rose">
        <XCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <div className="text-center mt-3">
          <div className="font-bold text-lg">QR Tanınamadı</div>
          <div className="text-sm text-muted mt-1">Bu QR kod sistemde kayıtlı değil.</div>
        </div>
      </Popup>
    );
  }

  if (result.type === "lesson") {
    const { status, booking } = result;
    const color = status === "ok" ? "emerald" : (status === "already_used" || status === "too_early") ? "amber" : "rose";
    const Icon  = status === "ok" ? CheckCircle2 : (status === "already_used" || status === "too_early") ? Clock : XCircle;

    return (
      <Popup onClose={onClose} color={color}>
        <div className="flex flex-col items-center gap-3">
          <Icon className={`w-9 h-9 text-${color}-400`} />
          <MemberAvatar name={booking.member.name} avatarUrl={booking.member.avatarUrl} size="lg" />
          <div className="text-center">
            <div className="font-bold text-xl">{booking.member.name}</div>
            <div className="text-xs text-muted mt-0.5">No: {booking.member.memberNo}</div>
          </div>
          <div className={`w-full rounded-xl p-4 bg-${color}-500/10 border border-${color}-500/20 space-y-2`}>
            <div className="flex items-center gap-2 text-sm">
              <Dumbbell className="w-4 h-4 text-neon shrink-0" />
              <span className="font-semibold">{booking.lesson.title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              {new Date(booking.lesson.startAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}
              {" · "}{booking.lesson.durationMin} dk
            </div>
            {booking.lesson.location && (
              <div className="flex items-center gap-2 text-xs text-muted">
                <MapPin className="w-3.5 h-3.5 shrink-0" />{booking.lesson.location}
              </div>
            )}
          </div>

          {status === "ok" && (
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" /> Yoklama alındı
            </div>
          )}

          {status === "too_early" && (
            <div className="text-amber-300 text-sm text-center">
              Giriş henüz açılmadı.{result.opensAt && (
                <> {new Date(result.opensAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} itibarıyla kabul edilecek.</>
              )}
            </div>
          )}

          {status === "already_used" && (
            <>
              <div className="text-amber-300 text-sm text-center">
                Bu üye{result.usedAt && (
                  <> {new Date(result.usedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} saatinde</>
                )} derse zaten girdi. Yine de kayıt edilsin mi?
              </div>
              <button
                onClick={() => onConfirm()}
                className="btn-secondary btn-sm w-full flex items-center justify-center gap-2"
              >
                <ChevronRight className="w-4 h-4" /> Evet, tekrar kaydet
              </button>
            </>
          )}

          {status === "cancelled" && (
            <div className="text-rose-300 text-sm text-center">Bu kayıt iptal edilmiş.</div>
          )}
        </div>
      </Popup>
    );
  }

  // Membership
  const { status, todayAlreadyCheckedIn, member } = result;
  const isExpired = status === "expired";
  const isDuplicate = !isExpired && todayAlreadyCheckedIn;
  const color = isExpired ? "rose" : isDuplicate ? "amber" : "emerald";

  return (
    <Popup onClose={onClose} color={color}>
      <div className="flex flex-col items-center gap-3">
        <MemberAvatar name={member.name} avatarUrl={member.avatarUrl} size="xl" />
        <div className="text-center">
          <div className="font-bold text-2xl">{member.name}</div>
          <div className="text-xs text-muted mt-0.5">No: {member.memberNo}</div>
        </div>

        {member.activePlan && (
          <div className={`w-full rounded-xl p-3 bg-${color}-500/10 border border-${color}-500/20 flex items-center gap-3`}>
            <CheckCircle2 className={`w-5 h-5 text-${color}-400 shrink-0`} />
            <div>
              <div className="font-semibold text-sm">{member.activePlan.name}</div>
              <div className="text-xs text-muted">
                {formatDate(new Date(member.activePlan.endDate))} tarihine kadar
              </div>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="text-rose-300 font-semibold text-center">Üyelik süresi dolmuş</div>
        )}

        {isDuplicate && (
          <>
            <div className="text-amber-300 text-sm text-center">
              Bu üye bugün zaten check-in yaptı. Yine de kayıt etmek ister misiniz?
            </div>
            <button
              onClick={() => onConfirm()}
              className="btn-secondary btn-sm w-full flex items-center justify-center gap-2"
            >
              <ChevronRight className="w-4 h-4" /> Evet, kaydet
            </button>
          </>
        )}

        {!isExpired && !isDuplicate && (
          <div className="flex items-center gap-2 text-emerald-300 font-semibold">
            <CheckCircle2 className="w-5 h-5" /> Hoş geldiniz!
          </div>
        )}
      </div>
    </Popup>
  );
}

function Popup({ children, onClose, color }: { children: React.ReactNode; onClose: () => void; color: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full max-w-sm bg-[var(--bg-card)] rounded-3xl border border-${color}-500/20 shadow-2xl p-6`}>
        {children}
        <button onClick={onClose} className="mt-4 w-full text-xs text-muted hover:text-body transition-colors py-1">
          Kapat
        </button>
      </div>
    </div>
  );
}

function MemberAvatar({ name, avatarUrl, size }: { name: string; avatarUrl: string | null; size: "lg" | "xl" }) {
  const dim = size === "xl" ? "w-24 h-24 text-2xl" : "w-16 h-16 text-xl";
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className={`${dim} rounded-2xl object-cover`} />;
  }
  return (
    <div className={`${dim} rounded-2xl bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 font-bold`}>
      {initials(name)}
    </div>
  );
}
