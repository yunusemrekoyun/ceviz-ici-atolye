import React from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import usePageMeta from "../hooks/usePageMeta";

export default function NotFoundPage() {
  usePageMeta({ title: "Sayfa bulunamadı", noindex: true });
  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-dark1 text-center text-light1 px-6">
      {/* 404 Başlık */}
      <h1 className="text-[120px] font-extrabold tracking-widest text-light2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
        404
      </h1>

      {/* Alt başlık */}
      <h2 className="mt-4 text-2xl md:text-3xl font-semibold text-white">
        Oops! Sayfa bulunamadı
      </h2>

      {/* Açıklama */}
      <p className="mt-3 max-w-md text-light2">
        Aradığın sayfa mevcut değil ya da taşınmış olabilir. Ana sayfaya dönerek
        keşfe devam edebilirsin.
      </p>

      {/* Buton */}
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-lg font-medium text-dark1 shadow-md transition hover:bg-light2 hover:scale-105 hover:shadow-lg"
      >
        <Home className="w-5 h-5" />
        Ana Sayfaya Dön
      </Link>
    </section>
  );
}
