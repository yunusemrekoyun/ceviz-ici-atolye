import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import "@/app/giris/giris.css";

export function AuthFrame({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="gs-login">
      <div className="gs-login-panel">
        <Link href="/" className="gs-login-brand" aria-label="Kütahya Galatasaray Futbol Okulu ana sayfası">
          <Image src="/home/crest.webp" alt="" width={48} height={48} />
          <span><strong>KÜTAHYA GALATASARAY</strong><small>Futbol Okulu</small></span>
        </Link>
        <header className="gs-login-heading"><h1>{title}</h1>{description ? <p>{description}</p> : null}</header>
        {children}
      </div>
    </div>
  );
}
