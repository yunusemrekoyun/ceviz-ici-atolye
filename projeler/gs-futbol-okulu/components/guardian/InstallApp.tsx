"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * "Ana ekrana ekle": Android'de (Chrome, Samsung) tek dokunuşla tarayıcının ekleme penceresi açılır; iPhone'da
 * Safari buna izin vermediği için üç adımlık yönerge gösterilir. Uygulama olarak açıldıysa ya da veli kapattıysa
 * (14 gün) görünmez.
 */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Mode = "hidden" | "prompt" | "ios" | "menu";

const HIDE_KEY = "gs-veli-kurulum-gizle";
const HIDE_DAYS = 14;

function hiddenByUser(): boolean {
  try {
    const at = Number(localStorage.getItem(HIDE_KEY));
    return Number.isFinite(at) && Date.now() - at < HIDE_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function InstallApp() {
  const [mode, setMode] = useState<Mode>("hidden");
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || hiddenByUser()) return;
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const touch = navigator.maxTouchPoints > 0;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setMode("prompt");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // Tarayıcı tek dokunuşla eklemeyi sunmazsa yönerge
    const timer = window.setTimeout(() => setMode((m) => (m === "hidden" && touch ? (ios ? "ios" : "menu") : m)), ios ? 0 : 1500);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  if (mode === "hidden") return null;

  const hide = () => {
    try {
      localStorage.setItem(HIDE_KEY, String(Date.now()));
    } catch {
      // depolama kapalı: yalnız bu açılışta gizlenir
    }
    setMode("hidden");
  };

  return (
    <section className="veli-card mt-4 overflow-hidden" aria-labelledby="kurulum-baslik">
      <div className="flex items-start gap-3 p-4">
        <Image src="/veli/ikon/192" alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl border border-[var(--v-line)]" unoptimized />
        <div className="min-w-0 flex-1">
          <h2 id="kurulum-baslik" className="veli-title text-[24px] text-[var(--v-red)]">
            Ana ekrana ekleyin
          </h2>
          <p className="text-[15px] text-[var(--v-muted)]">Panel telefonunuzda uygulama gibi tek dokunuşla açılsın.</p>
        </div>
      </div>
      <div className="px-4 pb-4">
        {mode === "prompt" ? (
          <button
            type="button"
            className="veli-btn veli-btn--primary w-full"
            onClick={async () => {
              if (!event) return;
              await event.prompt();
              const choice = await event.userChoice;
              setEvent(null);
              if (choice.outcome === "accepted") setMode("hidden");
            }}
          >
            Ana ekrana ekle
          </button>
        ) : mode === "ios" ? (
          <ol className="grid gap-2 text-[15px]">
            <li className="flex items-start gap-2">
              <Step n={1} />
              <span>
                Alttaki <ShareIcon /> <strong>Paylaş</strong> düğmesine dokunun.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Step n={2} />
              <span>
                <strong>Ana Ekrana Ekle</strong>&apos;yi seçin.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Step n={3} />
              <span>
                Sağ üstte <strong>Ekle</strong>&apos;ye dokunun.
              </span>
            </li>
          </ol>
        ) : (
          <ol className="grid gap-2 text-[15px]">
            <li className="flex items-start gap-2">
              <Step n={1} />
              <span>
                Tarayıcının sağ üstündeki <strong>⋮</strong> menüsüne dokunun.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Step n={2} />
              <span>
                <strong>Ana ekrana ekle</strong>&apos;yi ya da <strong>Uygulamayı yükle</strong>&apos;yi seçin.
              </span>
            </li>
          </ol>
        )}
        <button type="button" onClick={hide} className="mt-2 min-h-11 w-full cursor-pointer text-sm text-[var(--v-muted)]">
          Şimdi değil
        </button>
      </div>
    </section>
  );
}

function Step({ n }: { n: number }) {
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--v-soft)] text-[13px] font-medium text-[var(--v-red)]">{n}</span>;
}

function ShareIcon() {
  return (
    <svg className="inline h-5 w-5 shrink-0 align-[-4px] text-[#0a84ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="Paylaş simgesi">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}
