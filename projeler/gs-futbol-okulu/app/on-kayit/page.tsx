import type { Metadata } from "next";
import { FORM_TITLE, SCHOOL_NAME_LINE_1, SCHOOL_NAME_LINE_2 } from "@/lib/constants";
import { RegistrationForm } from "./RegistrationForm";

export const metadata: Metadata = {
  title: "Ön Kayıt Formu",
  description: "Galatasaray Spor Okulları Kütahya Futbol Okulu ön kayıt formu.",
};

export default function OnKayitPage() {
  return (
    <>
      <header className="bg-gs-red text-white">
        <div className="mx-auto w-full max-w-xl px-4 pb-5 pt-6 text-center sm:pt-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gs-yellow">{SCHOOL_NAME_LINE_1}</p>
          <h1 className="mt-1 text-xl font-extrabold uppercase tracking-wide sm:text-2xl">{SCHOOL_NAME_LINE_2}</h1>
          <p className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-semibold uppercase tracking-wider">
            {FORM_TITLE}
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-5 sm:py-6">
        <RegistrationForm />
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-muted">
        Bu form fiziksel kayıt formunun yerine geçmez; imza ve teslim işlemleri fiziksel form ile yapılır.
      </footer>
    </>
  );
}
