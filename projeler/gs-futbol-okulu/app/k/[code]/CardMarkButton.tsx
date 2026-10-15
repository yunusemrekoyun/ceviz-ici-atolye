"use client";

import { useState, useTransition } from "react";
import { scanAction } from "@/app/staff-actions";
import { Button } from "@/components/ui";

export function CardMarkButton({ code }: { code: string }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, startTransition] = useTransition();
  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="success"
        fullWidth
        className="min-h-14 text-lg"
        loading={busy}
        onClick={() =>
          startTransition(async () => {
            const res = await scanAction(code, null);
            if (!res.ok) setMessage({ ok: false, text: res.error });
            else setMessage({ ok: res.result.outcome === "marked" || res.result.outcome === "already", text: res.result.message });
          })
        }
      >
        Yoklamaya “geldi” yaz
      </Button>
      {message ? <p className={["mt-2 rounded-xl p-3 text-sm font-semibold", message.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"].join(" ")}>{message.text}</p> : null}
    </div>
  );
}
