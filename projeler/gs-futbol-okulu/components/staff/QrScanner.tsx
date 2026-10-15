"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import jsQR from "jsqr";
import { scanAction } from "@/app/staff-actions";
import type { ScanResult } from "@/lib/scan";
import { ACCESS_LABELS } from "@/lib/billing-shared";
import { formatPhone } from "@/lib/phone";
import { Button, Input } from "@/components/ui";

const GOOD = new Set(["marked", "already", "viewed"]);
const WARN = new Set(["no_session"]);

function feedback(ok: boolean): void {
  try {
    navigator.vibrate?.(ok ? 80 : [120, 80, 120]);
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
    osc.onended = () => void ctx.close();
  } catch {
    // ses/titreşim desteklenmiyorsa sessiz geç
  }
}

/**
 * Kamera ile kart okutma + numarayla elle giriş. Aynı kart 4 sn içinde tekrar okunmaz.
 * `sessionId` verilirse okutulan öğrenci o seansa yazılır; verilmezse şu anki seansı bulunur.
 */
export function QrScanner({ sessionId = null, onMarked }: { sessionId?: number | null; onMarked?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const busyRef = useRef(false);
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "denied" | "unsupported">("off");
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = useCallback(
    (text: string) => {
      busyRef.current = true;
      startTransition(async () => {
        const res = await scanAction(text, sessionId);
        busyRef.current = false;
        if (!res.ok) {
          setError(res.error);
          setResult(null);
          feedback(false);
          return;
        }
        setError(null);
        setResult(res.result);
        feedback(GOOD.has(res.result.outcome));
        if (res.result.outcome === "marked") onMarked?.();
      });
    },
    [sessionId, onMarked],
  );

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera("off");
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("unsupported");
      return;
    }
    setCamera("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setCamera("on");
    } catch {
      setCamera("denied");
    }
  }, []);

  useEffect(() => {
    if (camera !== "on") return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 200 || busyRef.current) return;
      last = t;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const w = Math.min(640, video.videoWidth);
      const h = Math.round((video.videoHeight / video.videoWidth) * w);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
      if (!code?.data) return;
      const now = Date.now();
      if (code.data === lastRef.current.text && now - lastRef.current.at < 4000) return;
      lastRef.current = { text: code.data, at: now };
      submit(code.data);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [camera, submit]);

  useEffect(() => stop, [stop]);

  const tone = !result ? "" : GOOD.has(result.outcome) ? "green" : WARN.has(result.outcome) ? "amber" : "red";
  const toneClass = { green: "border-emerald-500 bg-emerald-50", amber: "border-amber-400 bg-amber-50", red: "border-red-500 bg-red-50", "": "" }[tone];

  return (
    <div className="grid gap-4">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} playsInline muted className={["aspect-[4/3] w-full object-cover", camera === "on" ? "" : "hidden"].join(" ")} />
        {camera === "on" ? <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/80" aria-hidden="true" /> : null}
        {camera !== "on" ? (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 p-6 text-center text-white">
            {camera === "denied" ? (
              <p className="text-sm">Kamera izni verilmedi. Tarayıcı ayarlarından kameraya izin verin ya da numarayı aşağıya yazın.</p>
            ) : camera === "unsupported" ? (
              <p className="text-sm">Bu tarayıcı kamerayı desteklemiyor. Numarayı aşağıya yazın.</p>
            ) : null}
            <Button type="button" onClick={start} loading={camera === "starting"} className="min-h-12 px-6">
              Kamerayı aç
            </Button>
          </div>
        ) : (
          <button type="button" onClick={stop} className="absolute right-3 top-3 cursor-pointer rounded-lg bg-black/60 px-3 py-1.5 text-sm font-semibold text-white">
            Kapat
          </button>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) submit(manual.trim());
          setManual("");
        }}
      >
        <Input inputMode="numeric" placeholder="Öğrenci no ya da kart kodu" value={manual} onChange={(e) => setManual(e.target.value)} aria-label="Öğrenci numarası" />
        <Button type="submit" className="min-h-12 shrink-0 px-5" loading={pending}>
          Gönder
        </Button>
      </form>

      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}

      {result ? (
        <div className={`rounded-2xl border-4 p-4 ${toneClass}`} role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            {result.student?.photoFileId ? (
              // eslint-disable-next-line @next/next/no-img-element -- yetki kontrollü dosya adresi
              <img src={`/api/dosya/${result.student.photoFileId}`} alt="" className="h-20 w-16 shrink-0 rounded-lg object-cover" />
            ) : null}
            <div className="min-w-0">
              <p className="text-xl font-black text-ink">{result.student?.name ?? (tone === "red" ? "Geçersiz" : "")}</p>
              {result.student ? (
                <p className="text-sm text-muted">
                  No {result.student.studentNo ?? "—"} · {result.student.groupName ?? "Grupsuz"} · {ACCESS_LABELS[result.student.access]}
                </p>
              ) : null}
              <p className={["mt-2 text-lg font-bold", tone === "green" ? "text-emerald-800" : tone === "amber" ? "text-amber-800" : "text-red-800"].join(" ")}>{result.message}</p>
              {result.session ? (
                <p className="text-sm text-ink">
                  {result.session.groupName} · {result.session.startTime}–{result.session.endTime}
                </p>
              ) : null}
            </div>
          </div>
          {result.student && (result.outcome === "locked" || result.outcome === "no_session") && result.student.contactPhone ? (
            <p className="mt-3 text-sm text-ink">
              Veli: {result.student.contactName} ·{" "}
              <a className="font-semibold text-gs-red" href={`tel:${result.student.contactPhone}`}>
                {formatPhone(result.student.contactPhone)}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
