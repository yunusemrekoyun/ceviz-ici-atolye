import React, { useState, useEffect, useMemo } from "react";
import api from "../../../api";

export default function AddressForm({ address, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    title: "",
    mainaddress: "",
    street: "",
    district: "",
    city: "",
    postalCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (address) {
      setForm({
        title: address.title || "",
        mainaddress: address.mainaddress || "",
        street: address.street || "",
        district: address.district || "",
        city: address.city || "",
        postalCode: address.postalCode || "",
      });
    }
  }, [address]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const canSubmit = useMemo(() => {
    return (
      form.title.trim() &&
      form.mainaddress.trim() &&
      form.street.trim() &&
      form.city.trim()
    );
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (address) {
        await api.put(`/users/me/addresses/${address._id}`, form);
      } else {
        await api.post("/users/me/addresses", form);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Kaydetme başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 mx-auto w-full max-w-2xl rounded-2xl border border-light2 bg-white p-5 sm:p-6 shadow-sm"
    >
      <header className="mb-5">
        <h3 className="text-lg sm:text-xl font-semibold text-dark1">
          {address ? "Adresi Düzenle" : "Yeni Adres Ekle"}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Zorunlu alanlar: <b>Adres Başlığı</b>, <b>Adres</b>, <b>Sokak/Cadde</b>{" "}
          ve <b>Şehir</b>.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Adres Başlığı */}
        <div>
          <label className="block text-sm font-medium text-dark1 mb-1">
            Adres Başlığı <span className="text-red-600">*</span>
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            placeholder="Örn: Ev, İş…"
            className="w-full rounded-xl border border-light2 px-3 py-3 text-sm sm:text-base outline-none focus:border-dark1 focus:ring-2 focus:ring-dark1/10 transition"
          />
        </div>

        {/* Adres */}
        <div>
          <label className="block text-sm font-medium text-dark1 mb-1">
            Adres <span className="text-red-600">*</span>
          </label>
          <textarea
            name="mainaddress"
            value={form.mainaddress}
            onChange={handleChange}
            required
            rows={3}
            placeholder="Sokak, bina, daire no…"
            className="w-full rounded-xl border border-light2 px-3 py-3 text-sm sm:text-base outline-none focus:border-dark1 focus:ring-2 focus:ring-dark1/10 transition resize-y"
          />
        </div>

        {/* Sokak / Cadde */}
        <div>
          <label className="block text-sm font-medium text-dark1 mb-1">
            Sokak / Cadde <span className="text-red-600">*</span>
          </label>
          <input
              name="street"
              value={form.street}
              onChange={handleChange}
              required
            placeholder="Sokak / Cadde"
            className="w-full rounded-xl border border-light2 px-3 py-3 text-sm sm:text-base outline-none focus:border-dark1 focus:ring-2 focus:ring-dark1/10 transition"
          />
        </div>

        {/* Mahalle / Semt */}
        <div>
          <label className="block text-sm font-medium text-dark1 mb-1">
            Mahalle / Semt <span className="text-gray-400">(isteğe bağlı)</span>
          </label>
          <input
            name="district"
            value={form.district}
            onChange={handleChange}
            placeholder="Mahalle / Semt"
            className="w-full rounded-xl border border-light2 px-3 py-3 text-sm sm:text-base outline-none focus:border-dark1 focus:ring-2 focus:ring-dark1/10 transition"
          />
        </div>

        {/* Şehir + Posta Kodu */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-dark1 mb-1">
              Şehir <span className="text-red-600">*</span>
            </label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              required
              placeholder="İl / Şehir"
              className="w-full rounded-xl border border-light2 px-3 py-3 text-sm sm:text-base outline-none focus:border-dark1 focus:ring-2 focus:ring-dark1/10 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark1 mb-1">
              Posta Kodu <span className="text-gray-400">(isteğe bağlı)</span>
            </label>
            <input
              name="postalCode"
              value={form.postalCode}
              onChange={handleChange}
              inputMode="numeric"
              placeholder="PK"
              className="w-full rounded-xl border border-light2 px-3 py-3 text-sm sm:text-base outline-none focus:border-dark1 focus:ring-2 focus:ring-dark1/10 transition"
            />
          </div>
        </div>
      </div>

      {/* Aksiyonlar */}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto rounded-xl border border-light2 px-4 py-3 text-sm font-medium hover:bg-light1 transition"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className={`w-full sm:w-auto rounded-xl px-5 py-3 text-sm font-semibold text-white transition
            ${
              !canSubmit || loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-dark1 hover:bg-dark2"
            }`}
        >
          {loading ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
