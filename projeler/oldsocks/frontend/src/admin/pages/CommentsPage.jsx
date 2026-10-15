// src/pages/admin/CommentsPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api";
import { Button, IconButton } from "@material-tailwind/react";
import { TrashIcon, CheckIcon } from "@heroicons/react/24/outline";
import ToastAlert from "../../components/ui/ToastAlert"; // yolu kontrol edin
import useUnseenComments from "../../hooks/useUnseenComments";

/* ————— Silme Onay Modali ————— */
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

export default function CommentsPage() {
  const [filter, setFilter] = useState("approved"); // approved | pending
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  /* toast & sil onay */
  const [toast, setToast] = useState(null); // { msg, type }
  const [deleteId, setDeleteId] = useState(null);
  const { markSeen } = useUnseenComments(); // poll gerekmiyor
  useEffect(() => {
    markSeen(); // sayfa açılınca onaysız unseen yorumları seen yap
    // ekstra: pencere fokus alınca tekrar işaretlemek istersen:
    const fn = () => markSeen();
    window.addEventListener("focus", fn);
    return () => window.removeEventListener("focus", fn);
  }, [markSeen]);
  /* ——— Yorumları getir ——— */
  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const approved = filter === "approved";
      const { data } = await api.get(`/comments?approved=${approved}`);
      setComments(data);
    } catch {
      setToast({ msg: "Yorumlar yüklenemedi.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  /* ——— Onayla ——— */
  const handleApprove = async (id) => {
    try {
      await api.patch(`/comments/${id}/approve`);
      setToast({ msg: "Yorum onaylandı.", type: "success" });
      fetchComments();
    } catch {
      setToast({ msg: "Yorum onaylanamadı.", type: "error" });
    }
  };

  /* ——— Silme akışı ——— */
  const triggerDelete = (id) => setDeleteId(id);

  const handleDeleteConfirmed = async () => {
    const id = deleteId;
    setDeleteId(null);
    try {
      await api.delete(`/comments/${id}`);
      setToast({ msg: "Yorum silindi.", type: "success" });
      fetchComments();
    } catch {
      setToast({ msg: "Yorum silinemedi.", type: "error" });
    }
  };

  /* ——— Render ——— */
  return (
    <div>
      <h4 className="text-2xl mb-4">Yorum Yönetimi</h4>

      {/* Filtre butonları */}
      <div className="flex gap-4 mb-6">
        <Button
          size="sm"
          variant={filter === "approved" ? "filled" : "outlined"}
          onClick={() => setFilter("approved")}
        >
          Onaylanan
        </Button>
        <Button
          size="sm"
          variant={filter === "pending" ? "filled" : "outlined"}
          onClick={() => setFilter("pending")}
        >
          Onay Bekleyen
        </Button>
      </div>

      {loading ? (
        <div>Yükleniyor…</div>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li
              key={c._id}
              className="p-4 bg-white rounded shadow flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3"
            >
              {/* Yorum metni */}
              <div className="flex-1">
                <p className="font-medium break-words">
                  {c.author.firstName} {c.author.lastName}
                </p>
                <p className="text-sm mt-1 break-words">{c.text}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(c.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Butonlar */}
              <div className="flex gap-2 shrink-0">
                {filter === "pending" && (
                  <IconButton
                    variant="text"
                    color="green"
                    onClick={() => handleApprove(c._id)}
                  >
                    <CheckIcon className="h-5 w-5" />
                  </IconButton>
                )}
                <IconButton
                  variant="text"
                  color="red"
                  onClick={() => triggerDelete(c._id)}
                >
                  <TrashIcon className="h-5 w-5" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Silme onayı */}
      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirmed}
        message="Bu yorumu silmek istediğinize emin misiniz?"
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
