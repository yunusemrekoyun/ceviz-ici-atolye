import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthAPI } from "../lib/api";

export default function AdminLogin() {
  const nav = useNavigate();
  const loc = useLocation();
  const redirectTo = loc.state?.from?.pathname || "/admin/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await AuthAPI.login({ email, password });
      nav(redirectTo, { replace: true });
    } catch (e) {
      setErr(e.message || "Giriş başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-foreground grid place-items-center">
      <div className="w-full max-w-sm rounded-[var(--radius-2xl)] border border-border/60 bg-surface/80 p-6 shadow-[var(--shadow-soft)]">
        <header className="mb-4 text-center">
          <div className="text-[12px] tracking-[0.18em] text-muted">
            YÖNETİCİ
          </div>
          <h1 className="mt-1 text-[22px] font-semibold">Admin Girişi</h1>
        </header>

        {err && (
          <div className="mb-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <div className="mb-1.5 text-[13px] text-foreground/80">E-posta</div>
            <input
              type="email"
              className="w-full rounded-[var(--radius-lg)] border border-border/60 bg-surface-2/70 px-3 py-2 outline-none focus:ring-2 focus:ring-accent/30"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="block">
            <div className="mb-1.5 text-[13px] text-foreground/80">Şifre</div>
            <input
              type="password"
              className="w-full rounded-[var(--radius-lg)] border border-border/60 bg-surface-2/70 px-3 py-2 outline-none focus:ring-2 focus:ring-accent/30"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-[var(--radius-lg)] px-4 py-2.5 text-[15px] font-semibold text-black shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95 disabled:opacity-60"
            style={{ backgroundImage: "var(--gradient-accent)" }}
          >
            {busy ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
