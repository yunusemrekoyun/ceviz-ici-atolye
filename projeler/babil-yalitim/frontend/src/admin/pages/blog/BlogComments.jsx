// frontend/src/admin/pages/blog/BlogComments.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PropTypes from "prop-types";
import api from "../../../api";
import AdminLoadingState from "../../components/AdminLoadingState";
import LoadErrorState from "../../components/LoadErrorState";
import ToastAlert from "../../components/ToastAlert";
import ConfirmDialog from "../../components/ConfirmDialog";
import { getAdminFeedbackMessage } from "../../utils/mediaFeedback";

const PILL_COLORS = {
  gray: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  green:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  yellow:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100",
  red: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-100",
  emerald:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100",
  amber:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100",
};

const Pill = ({ children, color = "gray" }) => {
  const tone = PILL_COLORS[color] || PILL_COLORS.gray;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] ${tone}`}>
      {children}
    </span>
  );
};

Pill.propTypes = {
  children: PropTypes.node.isRequired,
  color: PropTypes.oneOf([
    "gray",
    "green",
    "yellow",
    "red",
    "blue",
    "sky",
    "emerald",
    "amber",
  ]),
};

Pill.defaultProps = { color: "gray" };

const BlogComments = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const inputCls =
    "w-full sm:w-72 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/30";

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info", duration = 4000) =>
    setToast({ msg, type, duration });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const { data } = await api.get(`/blogs/${id}/comments/all`);
      setBlog({
        title: data.title,
        comments: Array.isArray(data.comments) ? data.comments : [],
      });
    } catch (e) {
      console.error(
        "GET /blogs/:id/comments/all error:",
        e?.response?.data || e
      );
      const message = getAdminFeedbackMessage(e, "Yorumlar alınamadı.");
      setLoadError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    let items = blog?.comments || [];

    if (filter === "approved") {
      items = items.filter((comment) => comment.approved);
    }
    if (filter === "pending") {
      items = items.filter((comment) => !comment.approved);
    }
    if (search) {
      items = items.filter(
        (comment) =>
          comment.name?.toLowerCase().includes(search) ||
          comment.emailMasked?.toLowerCase().includes(search) ||
          comment.body?.toLowerCase().includes(search)
      );
    }

    return [...items].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [blog, q, filter]);

  const toggleApprove = async (commentId, nextVal) => {
    try {
      await api.patch(`/blogs/${id}/comments/${commentId}/approve`, {
        approved: nextVal,
      });
      setBlog((prev) => ({
        ...prev,
        comments: prev.comments.map((comment) =>
          comment._id === commentId
            ? { ...comment, approved: nextVal }
            : comment
        ),
      }));
      showToast(nextVal ? "Yorum onaylandı." : "Onay kaldırıldı.", "success");
    } catch (e) {
      console.error("PATCH approve error:", e?.response?.data || e);
      showToast(getAdminFeedbackMessage(e, "Güncellenemedi."), "error");
    }
  };

  const handleDeleteClick = (commentId) => {
    setPendingDeleteId(commentId);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const commentId = pendingDeleteId;
    if (!commentId) return;

    try {
      setConfirmLoading(true);
      await api.delete(`/blogs/${id}/comments/${commentId}`);
      setBlog((prev) => ({
        ...prev,
        comments: (prev.comments || []).filter(
          (comment) => comment._id !== commentId
        ),
      }));
      showToast("Yorum silindi.", "success");
    } catch (e) {
      console.error("DELETE comment error:", e?.response?.data || e);
      showToast(getAdminFeedbackMessage(e, "Silinemedi."), "error");
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setPendingDeleteId(null);
  };

  const hasActiveFilters = Boolean(q.trim()) || filter !== "all";
  const emptyMessage = hasActiveFilters
    ? "Seçili filtrelerle eşleşen yorum yok."
    : "Bu blog için henüz yorum yok.";

  if (loading && !blog) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <AdminLoadingState
          title="Yorumlar yükleniyor"
          message="Yorum listesi ve moderasyon durumu hazırlanıyor."
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="admin-section p-4 sm:p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-500/12 via-transparent to-slate-400/10 dark:from-[#2c2f36]/60 dark:via-transparent dark:to-[#1f2227]/50" />
        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="badge-soft">Yorumlar</span>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Yorumlar
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Blog:{" "}
              <span className="font-medium text-slate-900 dark:text-white">
                {blog?.title || "-"}
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ara (ad/e-posta/içerik)"
              className={inputCls}
            />
            <div className="flex gap-1">
              {[
                { k: "all", lbl: "Tümü" },
                { k: "pending", lbl: "Bekleyen" },
                { k: "approved", lbl: "Onaylı" },
              ].map(({ k, lbl }) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`rounded-xl px-3 py-2 text-sm transition ${
                    filter === k
                      ? "bg-slate-700 text-white shadow-sm dark:bg-[#2a2d32]"
                      : "border border-slate-200/70 bg-white/70 text-slate-700 hover:border-slate-300 dark:border-[#2c2f36] dark:bg-[#202124] dark:text-slate-100"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <Link to="/admin/blogs" className="btn-admin-ghost">
              ← Bloglara Dön
            </Link>
          </div>
        </div>
      </div>

      {loadError ? (
        <LoadErrorState
          title="Yorumlar yüklenemedi"
          message={loadError}
          onRetry={fetchAll}
        />
      ) : null}

      {loadError && !blog ? null : filtered.length === 0 ? (
        <div className="admin-card p-6 text-center text-slate-500 dark:text-slate-300">
          {emptyMessage}
        </div>
      ) : (
        <div className="admin-card overflow-hidden p-0">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50/70 text-left text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
              <tr>
                <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                  Kullanıcı
                </th>
                <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                  Yorum
                </th>
                <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                  Durum
                </th>
                <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                  Tarih
                </th>
                <th className="border border-slate-200/70 p-3 w-52 dark:border-slate-800/70">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((comment) => (
                <tr
                  key={comment._id}
                  className="align-top transition hover:bg-indigo-50/60 dark:hover:bg-slate-800/40"
                >
                  <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {comment.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">
                      {comment.emailMasked || "-"}
                    </div>
                  </td>
                  <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                    <div className="whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                      {comment.body}
                    </div>
                  </td>
                  <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                    {comment.approved ? (
                      <Pill color="green">Onaylı</Pill>
                    ) : (
                      <Pill color="yellow">Bekliyor</Pill>
                    )}
                  </td>
                  <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                    {comment.createdAt
                      ? new Date(comment.createdAt).toLocaleString("tr-TR")
                      : "-"}
                  </td>
                  <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          toggleApprove(comment._id, !comment.approved)
                        }
                        className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm ${
                          comment.approved
                            ? "bg-amber-600 hover:bg-amber-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {comment.approved ? "Onayı Kaldır" : "Onayla"}
                      </button>
                      <button
                        onClick={() => handleDeleteClick(comment._id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs text-slate-500 dark:border-slate-800/70 dark:bg-slate-900/50 dark:text-slate-300">
            Toplam: {blog?.comments?.length || 0} • Görüntülenen: {filtered.length}
          </div>
        </div>
      )}

      {toast ? (
        <ToastAlert
          msg={toast.msg}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Yorumu Sil"
        message="Bu yorumu silmek istediğinize emin misiniz?"
        confirmText="Evet, sil"
        cancelText="Vazgeç"
        type="danger"
        loading={confirmLoading}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (confirmLoading) return;
          cancelDelete();
        }}
      />
    </div>
  );
};

export default BlogComments;
