// src/components/admin/CategoryListPanel.jsx
import React, { useState } from "react";
import { FaEllipsisV } from "react-icons/fa";
import api from "../../../api";
import ToastAlert from "../../components/ui/ToastAlert";
import { FaEdit, FaTrashAlt } from "react-icons/fa";

/* ───────── Silme Onay Modali ───────── */
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

export default function CategoryListPanel({
  categories,
  onEdit,
  onDelete,
  isFull,
}) {
  /* toast & sil onay */
  const [toast, setToast] = useState(null); // { msg, type }
  const [deleteId, setDeleteId] = useState(null);

  /* ───────── Silme akışı ───────── */
  const triggerDelete = (id) => setDeleteId(id);

  const handleDeleteConfirmed = async () => {
    const id = deleteId;
    setDeleteId(null);
    try {
      await api.delete(`/categories/${id}`);
      setToast({ msg: "Kategori silindi.", type: "success" });
      onDelete(); // parent’ı bilgilendir
    } catch {
      setToast({ msg: "Kategori silinemedi.", type: "error" });
    }
  };

  /* ───────── renderItem ───────── */
  const renderItem = (c) => (
    <div
      key={c._id}
      onClick={() => onEdit(c)}
      className="bg-white shadow-md rounded-xl overflow-hidden group hover:shadow-xl transition-all relative cursor-pointer"
    >
      {/* Görsel Kısım */}
      <div className="relative w-full h-40">
        <img
          src={c.image}
          alt={c.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Hover Layer */}
        <div className="absolute inset-0 bg-white/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <FaEdit className="text-dark1 text-xl" />
        </div>

        {/* Sağ üst çöp simgesi */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerDelete(c._id);
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 z-10"
        >
          <FaTrashAlt />
        </button>
      </div>

      {/* Bilgiler */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-dark1">{c.name}</h3>
        {c.parent && (
          <p className="text-sm text-gray-500">Üst Kategori: {c.parent.name}</p>
        )}
        {c.children?.length > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            Alt Kategoriler:{" "}
            <span className="text-gray-700">
              {c.children.map((ch) => ch.name).join(", ")}
            </span>
          </p>
        )}
      </div>
    </div>
  );

  /* ───────── JSX ───────── */
  return (
    <>
      <div className={`grid ${isFull ? "grid-cols-4" : "grid-cols-2"} gap-4`}>
        {categories.map(renderItem)}
      </div>

      {/* Silme onayı */}
      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirmed}
        message="Bu kategoriyi silmek istediğinize emin misin?"
      />

      {/* Toast */}
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
