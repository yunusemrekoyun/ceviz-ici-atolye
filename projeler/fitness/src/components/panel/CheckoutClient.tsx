"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Loader2, X, ShoppingCart, Zap, Phone, Mail, MapPin, MessageCircle } from "lucide-react";

function IyzicoEmbed({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    container.innerHTML = html;

    // dangerouslySetInnerHTML doesn't execute scripts — replace each one with a live DOM script node
    container.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      Array.from(old.attributes).forEach((a) => s.setAttribute(a.name, a.value));
      if (old.textContent) s.textContent = old.textContent;
      old.parentNode?.replaceChild(s, old);
    });
  }, [html]);

  return <div ref={ref} />;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  durationDays: number;
  features: string[];
  isPopular: boolean;
}

interface ContactInfo {
  businessName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
}

interface Props {
  plans: Plan[];
  contact: ContactInfo;
}

function formatTRY(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 }).format(n);
}

function intervalLabel(interval: string) {
  if (interval === "MONTHLY") return "/ ay";
  if (interval === "YEARLY")  return "/ yıl";
  if (interval === "WEEKLY")  return "/ hafta";
  return "";
}

export function CheckoutClient({ plans, contact }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [couponCode, setCouponCode]     = useState("");
  const [modal, setModal]               = useState<
    | { type: "iyzico"; formContent: string }
    | { type: "paytr"; token: string }
    | { type: "offline"; planName: string; price: number; discount?: number | null }
    | null
  >(null);

  async function handleCheckout(plan: Plan) {
    setSelectedPlan(plan);
    setLoading(true);
    setError(null);

    try {
      const res  = await fetch("/api/checkout/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, couponCode: couponCode.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İşlem başarısız");

      if (data.mode === "offline") {
        setModal({ type: "offline", planName: plan.name, price: data.price ?? plan.price, discount: data.discount });
      } else if (data.mode === "iyzico") {
        setModal({ type: "iyzico", formContent: data.formContent });
      } else if (data.mode === "paytr") {
        setModal({ type: "paytr", token: data.token });
      } else {
        throw new Error(data.error || "Bilinmeyen hata");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu");
      setSelectedPlan(null);
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setModal(null);
    setSelectedPlan(null);
    setError(null);
  }

  return (
    <>
      {/* İndirim kodu */}
      <div className="card-surface p-4 mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-medium shrink-0">İndirim kodun var mı?</label>
        <input
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="Örn. YAZ2026"
          className="input-base font-mono uppercase sm:max-w-xs"
        />
        <span className="text-xs text-muted">Kodu gir, seçtiğin planda ödeme sırasında otomatik uygulanır.</span>
      </div>

      {/* Plan grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`card-surface p-6 flex flex-col relative transition-colors ${
              plan.isPopular ? "border-neon/30 bg-neon/[0.03]" : "hover:border-subtle-md"
            }`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="badge badge-neon text-xs px-3 py-1">
                  <Zap className="w-3 h-3" /> En Popüler
                </span>
              </div>
            )}
            <div className="mb-4">
              <h3 className="font-bold text-lg">{plan.name}</h3>
              {plan.description && <p className="text-sm text-label mt-1">{plan.description}</p>}
            </div>
            <div className="mb-5">
              <span className="text-3xl font-bold text-gradient-neon">{formatTRY(plan.price)}</span>
              <span className="text-muted text-sm ml-1">{intervalLabel(plan.interval)}</span>
              <div className="text-xs text-faint mt-1">{plan.durationDays} gün geçerli</div>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-dim">
                  <Check className="w-4 h-4 text-neon shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(plan)}
              disabled={loading && selectedPlan?.id === plan.id}
              className={`btn btn-md w-full ${plan.isPopular ? "btn-primary" : "btn-secondary"}`}
            >
              {loading && selectedPlan?.id === plan.id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><ShoppingCart className="w-4 h-4" />Satın Al</>}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="card-surface p-4 border-rose-500/20 bg-rose-500/5 text-sm text-rose-300">{error}</div>
      )}

      {/* iyzico ödeme modalı */}
      {modal?.type === "iyzico" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg bg-[var(--bg-card)] rounded-2xl border border-subtle-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-subtle">
              <div className="font-semibold text-sm">
                Güvenli Ödeme — <span className="text-neon">{selectedPlan?.name}</span>
              </div>
              <button onClick={closeModal} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-subtle-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 min-h-[400px]">
              <IyzicoEmbed html={modal.formContent} />
            </div>
            <div className="px-4 pb-4 text-xs text-faint text-center">
              Ödemeniz 256-bit SSL şifreleme ile korunmaktadır.
            </div>
          </div>
        </div>
      )}

      {/* PayTR iframe modalı */}
      {modal?.type === "paytr" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg bg-[var(--bg-card)] rounded-2xl border border-subtle-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-subtle">
              <div className="font-semibold text-sm">
                Güvenli Ödeme — <span className="text-neon">{selectedPlan?.name}</span>
              </div>
              <button onClick={closeModal} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-subtle-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2">
              <iframe
                src={`https://www.paytr.com/odeme/guvenli/${modal.token}`}
                style={{ width: "100%", height: "520px", border: "none" }}
                title="PayTR Ödeme"
                allow="payment"
              />
            </div>
            <div className="px-4 pb-4 text-xs text-faint text-center">
              Ödemeniz 256-bit SSL şifreleme ile korunmaktadır.
            </div>
          </div>
        </div>
      )}

      {/* Offline iletişim modalı */}
      {modal?.type === "offline" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">

            {/* Gradient header */}
            <div className="relative px-6 pt-8 pb-6 bg-gradient-to-br from-neon/10 via-neon/5 to-transparent border-b border-subtle">
              <button onClick={closeModal} className="absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-full hover:bg-subtle-md text-label transition-colors">
                <X className="w-4 h-4" />
              </button>
              <div className="text-xs font-semibold text-neon tracking-wider uppercase mb-2">Harika bir seçim</div>
              <h2 className="text-xl font-bold leading-snug">
                {modal.planName} paketini<br />almak için bize ulaşın
              </h2>
              <p className="text-sm text-body mt-2">
                Üyeliğinizi bugün başlatmak için aşağıdaki kanallardan birinden bize yazın, biz halledelim.
              </p>
              {/* Plan fiyat pill */}
              <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-neon/10 border border-neon/20">
                <span className="text-neon font-bold text-lg">{formatTRY(modal.price)}</span>
                <span className="text-xs text-muted">· {modal.planName}</span>
              </div>
              {modal.discount ? (
                <div className="mt-2 text-xs text-emerald-400">İndirim uygulandı: −{formatTRY(modal.discount)}</div>
              ) : null}
            </div>

            {/* İletişim kanalları */}
            <div className="p-5 space-y-2.5">
              {contact.whatsapp && (
                <a
                  href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Merhaba, ${modal.planName} paketini satın almak istiyorum.`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 grid place-items-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-emerald-400 font-medium">WhatsApp ile yaz</div>
                    <div className="text-sm font-semibold truncate">{contact.whatsapp}</div>
                  </div>
                  <div className="text-xs text-emerald-400 font-medium shrink-0 group-hover:translate-x-0.5 transition-transform">→</div>
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-4 p-4 rounded-2xl bg-subtle hover:bg-subtle-md border border-subtle-md transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-neon/10 grid place-items-center shrink-0">
                    <Phone className="w-5 h-5 text-neon" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted">Hemen ara</div>
                    <div className="text-sm font-semibold truncate">{contact.phone}</div>
                  </div>
                  <div className="text-xs text-neon font-medium shrink-0 group-hover:translate-x-0.5 transition-transform">→</div>
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`${modal.planName} paketi hakkında`)}&body=${encodeURIComponent(`Merhaba,\n\n${modal.planName} paketini satın almak istiyorum. Bilgi alabilir miyim?`)}`}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-subtle hover:bg-subtle-md border border-subtle-md transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-neon/10 grid place-items-center shrink-0">
                    <Mail className="w-5 h-5 text-neon" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted">E-posta gönder</div>
                    <div className="text-sm font-semibold truncate">{contact.email}</div>
                  </div>
                  <div className="text-xs text-neon font-medium shrink-0 group-hover:translate-x-0.5 transition-transform">→</div>
                </a>
              )}
              {contact.address && (
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-subtle border border-subtle-md">
                  <div className="w-10 h-10 rounded-xl bg-neon/10 grid place-items-center shrink-0">
                    <MapPin className="w-5 h-5 text-neon" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted">Salona gel</div>
                    <div className="text-sm leading-relaxed">{contact.address}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 pb-6">
              <button onClick={closeModal} className="w-full py-3 rounded-2xl text-sm text-muted hover:text-body transition-colors">
                Şimdi değil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
