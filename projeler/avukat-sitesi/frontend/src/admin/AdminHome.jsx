// src/admin/AdminHome.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthAPI } from "../lib/api";
import AdminTopBar from "./components/AdminTopBar";

export default function AdminHome() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);

  useEffect(() => {
    AuthAPI.me()
      .then((r) => setMe(r.user))
      .catch(() => nav("/admin", { replace: true }));
  }, [nav]);

  return (
    <div className="min-h-dvh bg-bg text-foreground">
      <div className="container-x section-y space-y-6">
        <AdminTopBar />

        {/* Başlık */}
        <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-surface/80 p-6 shadow-[var(--shadow-soft)]">
          <h1 className="text-[24px] font-semibold">
            Hoş geldin, {me?.email || "Admin"} 👋
          </h1>
          <p className="mt-2 text-muted">
            Yönetim ekranından içerikleri düzenleyebilirsin.
          </p>
        </div>

        {/* Yönetim Kartları */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Makaleler Kartı */}
          <DashCard
            title="Makaleler"
            desc="Makale oluştur, düzenle, sil ve mevcut makaleleri yönet."
            onClick={() => nav("/admin/articles")}
            icon={
              <>
                <path d="M4 4h16v16H4z" />
                <path d="M8 8h8M8 12h8M8 16h5" />
              </>
            }
          />

          {/* Yargıtay Kararları Kartı */}
          <DashCard
            title="Yargıtay Kararları"
            desc="Yeni karar ekle, düzenle, sil ve tüm kararları yönet."
            onClick={() => nav("/admin/decisions")}
            icon={
              <>
                <path d="M5 4h14v6H5z" />
                <path d="M5 14h14M8 18h8" />
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}

/** Tekrarlayan kart UI */
function DashCard({ title, desc, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-[var(--radius-2xl)] border border-border/60 bg-surface/80 p-5 shadow-[var(--shadow-soft)] transition-transform hover:scale-[1.01] hover:bg-surface-2/80 focus:outline-none focus:ring-2 focus:ring-accent/30"
    >
      <div className="flex items-start gap-4">
        {/* Altın rozet */}
        <span className="relative grid h-12 w-12 shrink-0 place-items-center text-[color:var(--color-accent)]">
          <span className="pointer-events-none absolute inset-0 rounded-full ring-[1.6px] ring-[color:var(--color-accent)]/90" />
          <span className="pointer-events-none absolute inset-[6px] rounded-full bg-[color:var(--color-surface)] ring-1 ring-[color:var(--color-accent)]/35" />
          <span
            className="pointer-events-none absolute -inset-1 -z-10 rounded-full blur-md"
            style={{ backgroundImage: "var(--gradient-accent)", opacity: 0.22 }}
          />
          <svg
            viewBox="0 0 24 24"
            className="relative z-10 h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            {icon}
          </svg>
        </span>

        <div>
          <h3 className="text-[18px] font-semibold leading-[1.25]">{title}</h3>
          <p className="mt-1 text-[14.5px] leading-[1.6] text-[color:var(--color-muted)]">
            {desc}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-[13px] text-foreground/80">
            <span className="transition-transform group-hover:translate-x-1">
              Yönetim sayfasına git
            </span>
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}
