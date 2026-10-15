import React, { useState } from "react";
import { IMaskInput } from "react-imask";
import api from "../../../api";
import { AccountRow } from "./AccountSection";
import { accountActionClass } from "./accountStyles";

const digitsOf = (value) => String(value || "").replace(/\D/g, "").slice(-10);
// +905321234567 → +90 532 123 45 67
const formatPhone = (value) => {
  const d = digitsOf(value);
  return d.length === 10 ? `+90 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : value;
};

// Profilde telefon görüntüleme ve düzenleme (kargo ve ödeme için gerekli).
export default function PhoneField({ phone, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(digitsOf(phone));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const digits = digitsOf(value);
    if (digits.length !== 10 || digits[0] !== "5") {
      setError("5 ile başlayan 10 haneli cep telefonu girin.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await api.put("/users/me", { phone: `+90${digits}` });
      onSaved?.(data?.phone || `+90${digits}`);
      setEditing(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Telefon kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <AccountRow
        label="Telefon"
        action={
          <button
            type="button"
            onClick={() => {
              setValue(digitsOf(phone));
              setEditing(true);
            }}
            className={accountActionClass}
          >
            {phone ? "Değiştir" : "Ekle"}
          </button>
        }
      >
        {phone ? formatPhone(phone) : <span className="text-dark2">Eklenmedi · kargo için gerekli</span>}
      </AccountRow>
    );
  }

  return (
    <div className="px-4 py-3.5 sm:px-5">
      <label htmlFor="profile-phone" className="text-xs font-medium text-dark2">
        Telefon
      </label>
      <div className="mt-1.5 flex items-center overflow-hidden rounded-xl border border-light2 bg-white focus-within:ring-2 focus-within:ring-dark1/15">
        <span className="border-r border-light2 bg-light1 px-3 py-3 text-dark2">+90</span>
        <IMaskInput
          id="profile-phone"
          aria-label="Cep telefonu"
          mask="500 000 00 00"
          definitions={{ 0: /[0-9]/ }}
          value={value}
          onAccept={(next) => setValue(next)}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="5__ ___ __ __"
          className="w-full px-3 py-3 outline-none"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError("");
          }}
          className="rounded-full px-4 py-2 text-sm font-medium text-dark1 ring-1 ring-light2 hover:bg-light1"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-dark1 px-4 py-2 text-sm font-semibold text-white hover:bg-dark2 disabled:opacity-60"
        >
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
