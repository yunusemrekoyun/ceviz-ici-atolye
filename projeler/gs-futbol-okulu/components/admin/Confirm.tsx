"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui";

type ConfirmOptions = { title: string; text?: ReactNode; confirmLabel: string; tone?: "danger" | "primary" };

/**
 * Geri alınamayan işlemler için onay: `const [confirm, confirmDialog] = useConfirm();`
 * `if (await confirm({ title, text, confirmLabel })) …` ve `{confirmDialog}` bileşene eklenir.
 */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback(
    (next: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOptions(next);
      }),
    [],
  );
  const finish = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  };

  const dialog = options ? (
    <Modal
      open
      title={options.title}
      onClose={() => finish(false)}
      footer={
        <>
          <Button type="button" size="md" variant="secondary" onClick={() => finish(false)}>
            Vazgeç
          </Button>
          <Button type="button" size="md" variant={options.tone === "primary" ? "primary" : "danger"} onClick={() => finish(true)} autoFocus>
            {options.confirmLabel}
          </Button>
        </>
      }
    >
      {options.text ? <div className="text-[15px] text-ink">{options.text}</div> : null}
    </Modal>
  ) : null;

  return [confirm, dialog];
}
