import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { formatTry } from "../utils/currency";
import usePageMeta from "../hooks/usePageMeta";

const STEPS = [
  { key: "paid", label: "Ödeme alındı", at: "paymentReceivedAt" },
  { key: "shipped", label: "Kargoya verildi", at: "shippedAt" },
  { key: "completed", label: "Tamamlandı", at: "deliveredAt" },
];
const STEP_INDEX = { payment_review: 0, paid: 0, shipped: 1, completed: 2 };

function fmtDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

function StatusSteps({ order }) {
  if (order.status === "cancelled") {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        <p>
          Bu sipariş {order.cancelledAt ? `${fmtDate(order.cancelledAt)} tarihinde ` : ""}iptal edildi.
        </p>
        {Number(order.refundAmount) > 0 && (
          <p className="mt-1">
            İade tutarı: <b>{formatTry(order.refundAmount)}</b>. İade ödemede kullandığınız karta yapılır;
            bankanıza bağlı olarak birkaç iş günü içinde yansır.
          </p>
        )}
        <p className="mt-1">Sorunuz varsa bizimle iletişime geçin.</p>
      </div>
    );
  }
  const current = STEP_INDEX[order.status] ?? 0;
  return (
    <ol className="space-y-3">
      {STEPS.map((step, index) => {
        const done = index <= current;
        return (
          <li key={step.key} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done ? "bg-dark1 text-white" : "border border-light2 bg-white text-gray-400"
              }`}
            >
              {done ? "✓" : index + 1}
            </span>
            <div>
              <p className={`text-sm font-medium ${done ? "text-dark1" : "text-gray-500"}`}>
                {step.label}
                {!done && <span className="sr-only"> (henüz değil)</span>}
              </p>
              {done && fmtDate(order[step.at]) && (
                <p className="text-xs text-dark2">{fmtDate(order[step.at])}</p>
              )}
            </div>
          </li>
        );
      })}
      {order.status === "payment_review" && (
        <li className="text-sm text-amber-800">
          Ödemeniz alındı, siparişiniz kontrol ediliyor. Gerekirse sizinle iletişime geçeceğiz.
        </li>
      )}
    </ol>
  );
}

export default function OrderTrackingPage() {
  usePageMeta({ title: "Sipariş Takibi", noindex: true });
  const [form, setForm] = useState({ orderNumber: "", email: "" });
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setOrder(null);
    setLoading(true);
    try {
      const { data } = await api.post("/orders/lookup", form, { skipAuthRefresh: true });
      setOrder(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Sipariş sorgulanamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-lg rounded-2xl border border-light2 bg-white p-6 shadow-lg sm:p-8">
        <h1 className="mb-2 text-center text-3xl font-bold text-dark1">Sipariş Takibi</h1>
        <p className="mb-6 text-center text-sm leading-6 text-dark2">
          Sipariş numaranızı ve siparişte kullandığınız e-posta adresini girin. Sipariş numarası
          onay e-postanızda yazar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="orderNumber" className="mb-1 block text-sm text-dark2">
              Sipariş numarası
            </label>
            <input
              id="orderNumber"
              name="orderNumber"
              inputMode="numeric"
              autoComplete="off"
              value={form.orderNumber}
              onChange={handleChange}
              required
              maxLength={24}
              placeholder="Örn. 1234567890"
              className="w-full rounded-lg border border-light2 bg-light1 px-4 py-3 text-dark1 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-dark1"
            />
          </div>
          <div>
            <label htmlFor="trackingEmail" className="mb-1 block text-sm text-dark2">
              E-posta adresi
            </label>
            <input
              id="trackingEmail"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
              maxLength={254}
              className="w-full rounded-lg border border-light2 bg-light1 px-4 py-3 text-dark1 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-dark1"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-dark1 py-3 font-semibold text-white transition hover:bg-dark2 disabled:opacity-50"
          >
            {loading ? "Sorgulanıyor..." : "Siparişi Sorgula"}
          </button>
        </form>

        <div aria-live="polite">
          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}

          {order && (
            <section className="mt-8 space-y-6 border-t border-light2 pt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-dark1">Sipariş #{order.orderNumber}</h2>
                <span className="text-sm text-dark2">{fmtDate(order.createdAt)}</span>
              </div>

              <StatusSteps order={order} />

              {order.shipping?.carrier && (
                <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <p>
                    Kargo firması: <b>{order.shipping.carrier}</b>
                  </p>
                  {order.shipping.trackingNumber && (
                    <>
                      <p>
                        Takip numarası: <b className="select-all tracking-wide">{order.shipping.trackingNumber}</b>
                      </p>
                      <p className="mt-1 text-xs text-blue-800/80">
                        Gönderinizi {order.shipping.carrier} sitesinden bu numarayla sorgulayabilirsiniz.
                      </p>
                    </>
                  )}
                </div>
              )}

              <ul className="divide-y divide-light2 rounded-xl border border-light2">
                {order.items.map((item, index) => (
                  <li key={index} className="flex items-start justify-between gap-4 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-dark1">{item.name}</p>
                      <p className="text-xs text-dark2">
                        {[item.size && `Beden: ${item.size}`, item.color && `Renk: ${item.color}`, `Adet: ${item.qty}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span className="whitespace-nowrap font-medium text-dark1">{formatTry(item.price)}</span>
                  </li>
                ))}
              </ul>
              <p className="flex justify-between text-sm font-semibold text-dark1">
                <span>Toplam</span>
                <span>{formatTry(order.totalPrice)}</span>
              </p>
            </section>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-dark2">
          Üye misiniz?{" "}
          <Link to="/profile" className="font-semibold text-dark1 hover:underline">
            Tüm siparişlerinizi hesabınızdan görebilirsiniz.
          </Link>
        </p>
      </div>
    </div>
  );
}
