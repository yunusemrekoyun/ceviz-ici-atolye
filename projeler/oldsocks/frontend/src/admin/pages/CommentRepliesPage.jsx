// src/pages/admin/CommentRepliesPage.jsx
import React, { useCallback, useEffect, useState } from "react";
import api from "../../../api";
import { Button, IconButton } from "@material-tailwind/react";
import { TrashIcon, CheckIcon } from "@heroicons/react/24/outline";
import ToastAlert from "../../components/ui/ToastAlert";
import useUnseenReplies from "../../hooks/useUnseenReplies";

/* ───────── Silme Onay Modali ───────── */
const ConfirmModal = ({ open, onClose, onConfirm, message }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl p-6 shadow max-w-sm w-full">
        <p className="mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="text" onClick={onClose}>
            Vazgeç
          </Button>
          <Button color="red" onClick={onConfirm}>
            Sil
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ───────── Basit Skeleton ───────── */
const RowSkeleton = () => (
  <li className="p-4 bg-white rounded-xl border border-gray-100">
    <div className="animate-pulse space-y-2">
      <div className="h-4 w-40 bg-gray-200 rounded" />
      <div className="h-3 w-full bg-gray-200 rounded" />
      <div className="h-3 w-2/3 bg-gray-200 rounded" />
    </div>
  </li>
);

export default function CommentRepliesPage() {
  const [filter, setFilter] = useState("approved"); // approved | pending
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);

  /* toast & sil onay */
  const [toast, setToast] = useState(null); // { msg, type }
  const [deleteId, setDeleteId] = useState(null);

  /* unseen -> görüldü yap */
  const { markSeen } = useUnseenReplies();
  useEffect(() => {
    markSeen();
    const fn = () => markSeen();
    window.addEventListener("focus", fn);
    return () => window.removeEventListener("focus", fn);
  }, [markSeen]);

  /* ───────── Yanıtları getir ───────── */
  const fetchReplies = useCallback(async () => {
    setLoading(true);
    try {
      const approved = filter === "approved";
      const { data } = await api.get(`/replies?approved=${approved}`);
      setReplies(Array.isArray(data) ? data : []);
    } catch {
      setToast({ msg: "Yanıtlar yüklenemedi.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  /* ───────── Onayla ───────── */
  const handleApprove = async (id) => {
    try {
      await api.patch(`/replies/${id}/approve`);
      setToast({ msg: "Yanıt onaylandı.", type: "success" });
      fetchReplies();
    } catch {
      setToast({ msg: "Yanıt onaylanamadı.", type: "error" });
    }
  };

  /* ───────── Silme akışı ───────── */
  const triggerDelete = (id) => setDeleteId(id);

  const handleDeleteConfirmed = async () => {
    const id = deleteId;
    setDeleteId(null);
    try {
      await api.delete(`/replies/${id}`);
      setToast({ msg: "Yanıt silindi.", type: "success" });
      fetchReplies();
    } catch {
      setToast({ msg: "Yanıt silinemedi.", type: "error" });
    }
  };

  /* ───────── Render ───────── */
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h4 className="text-2xl font-semibold">Yorum Yanıtlarını Yönet</h4>

        {/* Filtre butonları */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={filter === "approved" ? "filled" : "outlined"}
            onClick={() => setFilter("approved")}
            className="flex-1 sm:flex-none"
          >
            Onaylanan
          </Button>
          <Button
            size="sm"
            variant={filter === "pending" ? "filled" : "outlined"}
            onClick={() => setFilter("pending")}
            className="flex-1 sm:flex-none"
          >
            Onay Bekleyen
          </Button>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <ul className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </ul>
      ) : replies.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-base font-medium mb-2">Kayıt bulunamadı</p>
          <p className="text-gray-600">
            {filter === "pending"
              ? "Onay bekleyen yanıt yok."
              : "Bu liste şu an boş görünüyor."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {replies.map((r) => {
            const name = `${r.author?.firstName || ""} ${
              r.author?.lastName || ""
            }`.trim();
            const ts = r.createdAt
              ? new Date(r.createdAt).toLocaleString()
              : "";

            return (
              <li
                key={r._id}
                className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-start md:justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{name || "—"}</p>
                  <p className="text-sm mt-1 break-words">{r.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{ts}</p>
                </div>

                <div className="flex items-center justify-end gap-1 md:gap-2">
                  {filter === "pending" && (
                    <IconButton
                      variant="text"
                      color="green"
                      onClick={() => handleApprove(r._id)}
                      aria-label="Onayla"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </IconButton>
                  )}
                  <IconButton
                    variant="text"
                    color="red"
                    onClick={() => triggerDelete(r._id)}
                    aria-label="Sil"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Silme onayı */}
      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirmed}
        message="Bu yanıtı silmek istediğinize emin misiniz?"
      />

      {/* Toast */}
      {toast && (
        <ToastAlert
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
