import React, { useEffect, useState } from "react";
import api from "../../../api";
import AddressCard from "./AddressCard";
import AddressForm from "./AddressForm";
import ToastAlert from "../ui/ToastAlert";

/* Basit silme onay modali (yalnızca bu dosyada kullanılıyor) */
const ConfirmModal = ({ open, onClose, onConfirm, message }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full">
        <p className="mb-6 text-dark1">{message}</p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-light2 hover:bg-light1 transition"
          >
            Vazgeç
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
};

/* Basit iskelet loader */
const SkeletonCard = () => (
  <div className="animate-pulse rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
    <div className="h-4 w-32 bg-light2 rounded mb-3" />
    <div className="h-3 w-full bg-light2 rounded mb-2" />
    <div className="h-3 w-2/3 bg-light2 rounded mb-2" />
    <div className="h-3 w-1/3 bg-light2 rounded" />
    <div className="mt-4 h-9 w-28 bg-light2 rounded" />
  </div>
);

export default function AddressList() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingAddr, setEditingAddr] = useState(null);
  const [showForm, setShowForm] = useState(false);

  /* toast & onay */
  const [toast, setToast] = useState(null);
  const [confirmId, setConfirmId] = useState(null); // silinecek adres id

  const fetchAddresses = () => {
    setLoading(true);
    api
      .get("/users/me/addresses")
      .then(({ data }) => {
        setAddresses(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch((err) =>
        setError(err.response?.data?.message || "Adresler alınamadı.")
      )
      .finally(() => setLoading(false));
  };

  useEffect(fetchAddresses, []);

  /* Silme akışı */
  const triggerDelete = (id) => setConfirmId(id);

  const handleDeleteConfirmed = async () => {
    const id = confirmId;
    setConfirmId(null);
    try {
      await api.delete(`/users/me/addresses/${id}`);
      setAddresses((list) => list.filter((a) => a._id !== id));
      setToast({ msg: "Adres silindi.", type: "success" });
    } catch {
      setToast({ msg: "Adres silinemedi.", type: "error" });
    }
  };

  const handleEdit = (addr) => {
    setEditingAddr(addr);
    setShowForm(true);
  };

  const onFormSuccess = () => {
    setShowForm(false);
    setEditingAddr(null);
    fetchAddresses();
  };

  /* ———— UI ———— */

  const openNew = () => {
    setEditingAddr(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-dark1">Adreslerim</h2>
          <p className="text-sm text-dark2">Gönderim ve fatura adresleriniz.</p>
        </div>
        {!showForm && addresses.length > 0 && (
          <button
            type="button"
            onClick={openNew}
            className="shrink-0 rounded-full bg-dark1 px-4 py-2 text-sm font-semibold text-white transition hover:bg-dark2"
          >
            + Yeni adres
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
          <AddressForm
            address={editingAddr}
            onSuccess={onFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingAddr(null);
            }}
          />
        </div>
      )}

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading && (
        <div className="grid gap-3 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && !addresses.length && !showForm && (
        <div className="rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-black/5">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-light1">
            <span className="text-2xl">📍</span>
          </div>
          <h3 className="mb-1 font-semibold text-dark1">Kayıtlı adres yok</h3>
          <p className="mb-5 text-sm text-dark2">Alışverişi hızlandırmak için bir adres ekleyin.</p>
          <button
            type="button"
            onClick={openNew}
            className="rounded-full bg-dark1 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-dark2"
          >
            Adres ekle
          </button>
        </div>
      )}

      {!loading && addresses.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {addresses.map((addr) => (
            <AddressCard key={addr._id} addr={addr} onEdit={handleEdit} onDelete={triggerDelete} />
          ))}
        </div>
      )}

      {/* Sil onay modalı */}
      <ConfirmModal
        open={Boolean(confirmId)}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDeleteConfirmed}
        message="Bu adres silinsin mi?"
      />

      {/* Toast (sabit, sağ-altta) */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[70]">
          <ToastAlert
            msg={toast.msg}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
