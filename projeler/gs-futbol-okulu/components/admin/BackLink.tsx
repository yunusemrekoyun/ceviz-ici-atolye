"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useListHref, useRememberList } from "@/lib/use-url-filters";

/** Listeye dönüş: listenin son süzgeçli adresine gider (ör. "← Öğrenciler" seçili grupla açılır). */
export function BackLink({ path, label, className }: { path: string; label: string; className?: string }) {
  const href = useListHref(path);
  return (
    <Link href={href} className={className ?? "-ml-1 mb-2 inline-flex min-h-8 items-center gap-0.5 rounded-lg pr-2 text-sm font-medium text-muted transition hover:text-ink pointer-coarse:min-h-11"}>
      <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {label}
    </Link>
  );
}

/** Sunucu bileşeni olan listelerde adresi hatırlatmak için. */
export function RememberList() {
  useRememberList();
  return null;
}
