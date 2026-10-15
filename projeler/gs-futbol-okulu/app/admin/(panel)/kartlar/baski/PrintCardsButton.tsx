"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { markPrintedAction } from "../actions";

export function PrintCardsButton({ cardIds }: { cardIds: number[] }) {
  const [busy, startTransition] = useTransition();
  return (
    <Button
      type="button"
      loading={busy}
      onClick={() =>
        startTransition(async () => {
          await markPrintedAction(cardIds);
          window.print();
        })
      }
    >
      Yazdır / PDF Kaydet
    </Button>
  );
}
