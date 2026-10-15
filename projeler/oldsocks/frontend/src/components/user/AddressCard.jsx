import React from "react";

// Kayıtlı adres kartı; düzenle ve sil kartın altında küçük düğmeler.
export default function AddressCard({ addr, onEdit, onDelete }) {
  if (!addr) return null;

  return (
    <div className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
      <h3 className="text-base font-semibold text-dark1">{addr.title}</h3>
      <div className="mt-1.5 space-y-0.5 text-sm leading-6 text-dark2">
        <p>{addr.mainaddress}</p>
        {(addr.street || addr.district) && <p>{[addr.street, addr.district].filter(Boolean).join(", ")}</p>}
        <p className="font-medium text-dark1">
          {addr.city} {addr.postalCode ? `· ${addr.postalCode}` : ""}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onDelete(addr._id)}
          className="rounded-full px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          Sil
        </button>
        <button
          type="button"
          onClick={() => onEdit(addr)}
          className="rounded-full px-4 py-2 text-sm font-semibold text-dark1 ring-1 ring-light2 transition hover:bg-light1"
        >
          Düzenle
        </button>
      </div>
    </div>
  );
}
