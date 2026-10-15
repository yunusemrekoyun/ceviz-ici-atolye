"use client";

import { Download } from "lucide-react";

export function PrintButton({ label = "PDF İndir" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary btn-md no-print">
      <Download className="w-4 h-4" />
      {label}
    </button>
  );
}
