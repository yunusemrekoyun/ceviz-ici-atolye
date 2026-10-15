import React, { useState } from "react";
import { FaEllipsisV } from "react-icons/fa";
import api from "../../../api";
import ToastAlert from "../../components/ui/ToastAlert";

const ConfirmModal = ({ open, onClose, onConfirm, message }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl p-6 shadow max-w-sm w-full">
        <p className="mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border hover:bg-gray-100"
          >
            Vazgeç
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ProductListPanel({
  products,
  onEdit,
  onDelete,
  isFull,
}) {
  const [toast, setToast] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const triggerDelete = (id) => setDeleteId(id);

  const handleDeleteConfirmed = async () => {
    const id = deleteId;
    setDeleteId(null);
    try {
      await api.delete(`/products/${id}`);
      setToast({ msg: "Ürün silindi.", type: "success" });
      onDelete();
    } catch {
      setToast({ msg: "Ürün silinemedi.", type: "error" });
    }
  };

  return (
    <>
      <div className={`grid ${isFull ? "grid-cols-4" : "grid-cols-2"} gap-4`}>
        {products.map((p) => (
          <div
            key={p._id}
            className="border rounded p-2 relative group bg-white"
          >
            <img
              src={p.images[0]}
              alt={p.name}
              className="w-full h-32 object-cover rounded"
            />
            <div className="mt-2 text-sm">
              <p>{p.price}₺</p>
              <p className="text-gray-500">
                {p.category?.name || "Kategori Yok"}
              </p>
              <p className="text-xs text-gray-400">
                Stok:{" "}
                {p.sizes?.reduce((sum, s) => sum + (s.stock || 0), 0) ?? 0}
              </p>
            </div>

            {/* üç nokta menüsü */}
            <div className="absolute top-8 right-2 hidden group-hover:block bg-white shadow rounded z-10">
              <button
                onClick={() => onEdit(p)}
                className="block px-2 py-1 hover:bg-gray-100 w-full text-left"
              >
                Düzenle
              </button>

              <button
                onClick={() => onEdit({ _id: p._id, parentProductId: p._id })}
                className="block px-2 py-1 hover:bg-gray-100 w-full text-left"
              >
                Yeni Renk Ekle
              </button>

              <button
                onClick={() => triggerDelete(p._id)}
                className="block px-2 py-1 text-red-600 hover:bg-gray-100 w-full text-left"
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* silme onayı */}
      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirmed}
        message="Silmek istediğine emin misin?"
      />

      {/* toast */}
      {toast && (
        <ToastAlert
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
