"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui";

// Kamera ve QR çözücü yalnız tarama açılınca yüklenir.
const QrScanner = dynamic(() => import("./QrScanner").then((m) => m.QrScanner), { ssr: false, loading: () => <p className="text-sm text-muted">Kamera açılıyor…</p> });

/** Seans seçmeden kart okutma: öğrencinin o anki seansı bulunur. */
export function ScanPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-3">
      <Button type="button" className="min-h-14 text-lg lg:min-h-11 lg:justify-self-start lg:px-5 lg:text-[15px]" onClick={() => setOpen((v) => !v)}>
        {open ? "Taramayı kapat" : "Kart okut"}
      </Button>
      {open ? <QrScanner /> : null}
    </div>
  );
}
