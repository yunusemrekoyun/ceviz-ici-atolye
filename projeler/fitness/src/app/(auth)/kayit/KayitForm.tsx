"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { User, Mail, Lock, Phone, Loader2, ArrowRight, Sparkles, Gift } from "lucide-react";
import { PhoneInput } from "@/components/ui/PhoneInput";

export function KayitForm({ initialRef = "" }: { initialRef?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", referralCode: initialRef });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kayıt başarısız");
      router.push("/panel");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <span className="badge badge-neon">
        <Sparkles className="w-3 h-3" />7 gün ücretsiz deneme
      </span>
      <h1 className="h-display text-3xl mt-3">Ücretsiz denemeni başlat</h1>
      <p className="mt-2 text-sm text-body">
        Kart bilgisi gerekmez. Zaten üye misin?{" "}
        <Link href="/giris" className="text-neon hover:underline">Giriş yap</Link>
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label-base">Ad Soyad</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-base pl-10" placeholder="Adınız Soyadınız" />
          </div>
        </div>
        <div>
          <label className="label-base">E-posta</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-base pl-10" placeholder="ornek@email.com" />
          </div>
        </div>
        <div>
          <label className="label-base">Telefon (opsiyonel)</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <PhoneInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} className="input-base pl-10" />
          </div>
        </div>
        <div>
          <label className="label-base">Şifre</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-base pl-10" placeholder="En az 6 karakter" />
          </div>
        </div>
        <div>
          <label className="label-base">Davet Kodu (opsiyonel)</label>
          <div className="relative">
            <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input value={form.referralCode} onChange={(e) => setForm({ ...form, referralCode: e.target.value })} className="input-base pl-10" placeholder="Bir arkadaşın davet etti mi?" />
          </div>
        </div>

        {err && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</div>}

        <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>7 Günlük Denemeyi Başlat <ArrowRight className="w-4 h-4" /></>}
        </button>

        <p className="text-xs text-muted text-center">
          Devam ederek <a className="underline hover:text-neon transition-colors" href="/kullanim-sartlari" target="_blank" rel="noopener noreferrer">Kullanım Şartları</a> ve <a className="underline hover:text-neon transition-colors" href="/gizlilik" target="_blank" rel="noopener noreferrer">Gizlilik Politikası</a>'nı kabul edersin.
        </p>
      </form>
    </div>
  );
}
