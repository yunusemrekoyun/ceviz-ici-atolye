"use client";

import Link from "next/link";
import { CircleAlert, Clock3 } from "lucide-react";
import { useEffect, useRef } from "react";

export type MissingInfoProps = {
  firstName: string;
  problems: { key: string; label: string }[];
  /** Bilgileri tamamlama sayfası. */
  href: string;
  /** Velinin gönderdiği bilgiler okulun onayını bekliyorsa gönderim zamanı. */
  pendingAt: string | null;
  /** Pencere açılsın mı (kart sayfasında hayır: sahada QR'ı göstermek beklemesin, yalnız şerit). */
  modal?: boolean;
};

/**
 * Eksik ya da hatalı bilgi varsa her sayfa açılışında çıkan pencere ve sayfadaki uyarı şeridi.
 * Veli bilgileri gönderdiyse pencere çıkmaz, şeritte "onay bekliyor" yazar.
 */
export function MissingInfo({ firstName, problems, href, pendingAt, modal = true }: MissingInfoProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (modal && problems.length && !pendingAt && !dialog.current?.open) dialog.current?.showModal();
  }, [modal, problems.length, pendingAt]);
  if (!problems.length) return null;
  const shown = problems.slice(0, 5);

  if (pendingAt)
    return (
      <div className="veli-notice" role="status"><Clock3 size={20} aria-hidden="true" /><div><p>
        Gönderdiğiniz bilgiler okulun onayını bekliyor. Onaylanınca burada görünecek.{" "}
        </p><Link href={href}>
          Yeniden düzenle
        </Link>
      </div></div>
    );

  return (
    <>
      <div className="veli-notice"><CircleAlert size={20} aria-hidden="true" /><div>
        <p>Sistemde eksik ya da hatalı bilginiz var.</p>
        <Link href={href}>
          Bilgileri tamamla
        </Link>
      </div></div>
      <dialog ref={dialog} className="veli-dialog" aria-labelledby="eksik-baslik">
        <div className="veli-stripe" aria-hidden="true" />
        <div className="p-5">
          <h2 id="eksik-baslik" className="veli-title text-[32px] text-[var(--v-red)]">
            Bilgilerinizi tamamlayın
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed">{firstName} için sistemde eksik ya da hatalı bilgi var. Lütfen doldurun; okul kontrol edip kaydeder.</p>
          <ul className="mt-3 grid gap-1.5">
            {shown.map((p) => (
              <li key={p.key} className="flex items-start gap-2 text-[15px]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--v-red)]" aria-hidden="true" />
                {p.label}
              </li>
            ))}
            {problems.length > shown.length ? <li className="pl-3.5 text-[15px] text-[var(--v-muted)]">ve {problems.length - shown.length} bilgi daha</li> : null}
          </ul>
          <div className="mt-5 grid gap-2">
            <Link href={href} className="veli-btn veli-btn--primary">
              Bilgileri tamamla
            </Link>
            <button type="button" onClick={() => dialog.current?.close()} className="veli-btn veli-btn--line">
              Daha sonra
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
