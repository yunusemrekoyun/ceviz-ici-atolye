// src/admin/pages/blog/BlogList.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api";
import AdminLoadingState from "../../components/AdminLoadingState";
import LoadErrorState from "../../components/LoadErrorState";
import ToastAlert from "../../components/ToastAlert";
import ConfirmDialog from "../../components/ConfirmDialog";
import OrderSelect from "../../components/OrderSelect";
import BlogTranslationModal from "../../components/BlogTranslationModal";
import { getAdminFeedbackMessage } from "../../utils/mediaFeedback";
import { getMediaUrl, getVideoPosterUrl } from "../../../utils/media";

const clamp2 = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const isVideoCover = (cover) =>
  cover?.resourceType === "video" ||
  /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(cover?.url || "");

const renderCover = (cover, title, className) => {
  const coverUrl = getMediaUrl(cover);
  const posterUrl = getVideoPosterUrl(cover, { fallbackSrc: coverUrl });

  if (!coverUrl) {
    return (
      <div
        className={`${className} grid shrink-0 place-items-center rounded-md border border-dashed bg-slate-100/70 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/60`}
      >
        Kapak yok
      </div>
    );
  }

  if (isVideoCover(cover)) {
    return (
      <div className="relative shrink-0">
        <video
          src={coverUrl}
          poster={posterUrl || undefined}
          className={`${className} rounded-md border border-slate-200/70 object-cover dark:border-slate-800`}
          muted
          playsInline
          preload="metadata"
        />
        <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
          video
        </span>
      </div>
    );
  }

  return (
    <img
      src={posterUrl || coverUrl}
      alt={title}
      className={`${className} shrink-0 rounded-md border border-slate-200/70 object-cover dark:border-slate-800`}
    />
  );
};

const BlogList = () => {
  const inputCls =
    "w-full sm:w-72 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/30";

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderingId, setOrderingId] = useState("");
  const [q, setQ] = useState("");
  const [loadError, setLoadError] = useState("");

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info", duration = 4000) =>
    setToast({ msg, type, duration });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [translationTarget, setTranslationTarget] = useState(null);

  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const { data } = await api.get("/blogs");
      setBlogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("GET /blogs error:", e?.response?.data || e);
      const message = getAdminFeedbackMessage(e, "Bloglar getirilemedi.");
      setLoadError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return blogs;

    return blogs.filter(
      (blog) =>
        blog.title?.toLowerCase().includes(search) ||
        blog.content?.toLowerCase().includes(search) ||
        (blog.tags || []).some((tag) => tag.toLowerCase().includes(search))
    );
  }, [blogs, q]);

  const askDelete = (id) => {
    setConfirmTargetId(id);
    setConfirmOpen(true);
  };

  const handleOrderChange = async (id, nextOrder) => {
    try {
      setOrderingId(id);
      await api.patch(`/blogs/${id}/order`, { displayOrder: nextOrder });
      await fetchBlogs();
      showToast("Blog sırası güncellendi.", "success", 2500);
    } catch (e) {
      console.error("PATCH /blogs/:id/order error:", e?.response?.data || e);
      showToast(
        getAdminFeedbackMessage(e, "Blog sırası güncellenemedi."),
        "error"
      );
    } finally {
      setOrderingId("");
    }
  };

  const confirmDelete = async () => {
    const id = confirmTargetId;
    if (!id) return;

    try {
      setConfirmLoading(true);
      await api.delete(`/blogs/${id}`);
      await fetchBlogs();
      showToast("Blog silindi", "success");
    } catch (e) {
      console.error("DELETE /blogs/:id error:", e?.response?.data || e);
      showToast(
        getAdminFeedbackMessage(e, "Silme işlemi başarısız."),
        "error"
      );
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmTargetId(null);
    }
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setConfirmTargetId(null);
  };

  const openTranslationModal = (blog) => {
    setTranslationTarget(blog);
    setTranslationOpen(true);
  };

  const closeTranslationModal = () => {
    setTranslationOpen(false);
    setTranslationTarget(null);
  };

  const hasActiveFilters = Boolean(q.trim());
  const emptyMessage = hasActiveFilters
    ? "Aramanızla eşleşen blog bulunamadı."
    : "Henüz blog kaydı yok.";

  if (loading && !blogs.length) {
    return (
      <div className="p-4 md:p-6 overflow-x-hidden">
        <AdminLoadingState
          title="Bloglar yükleniyor"
          message="Blog listesi ve yorum istatistikleri hazırlanıyor."
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 overflow-x-hidden space-y-5">
      <div className="admin-section p-4 sm:p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-500/12 via-transparent to-slate-400/10 dark:from-[#2c2f36]/60 dark:via-transparent dark:to-[#1f2227]/50" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="badge-soft">İçerik</span>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Bloglar
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Listeler, butonlar ve kartlar koyu/açık temaya göre yenilendi.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ara (başlık/içerik/etiket)"
              className={inputCls}
            />
            <Link to="/admin/blogs/add" className="btn-admin-primary shrink-0">
              + Yeni Blog
            </Link>
          </div>
        </div>
      </div>

      {loadError ? (
        <LoadErrorState
          title="Bloglar yüklenemedi"
          message={loadError}
          onRetry={fetchBlogs}
        />
      ) : null}

      {loadError && !blogs.length ? null : filtered.length === 0 ? (
        <div className="admin-card p-6 text-center text-slate-500 dark:text-slate-300">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:hidden">
            {filtered.map((blog) => (
              <div
                key={blog._id}
                className="admin-card relative overflow-hidden p-4"
              >
                <div className="flex items-start gap-3">
                  {renderCover(blog.cover, blog.title, "h-16 w-24")}

                  <div className="min-w-0 flex-1">
                    <div
                      className="font-semibold leading-snug break-words text-slate-900 dark:text-white"
                      style={clamp2}
                      title={blog.title}
                    >
                      {blog.title}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1">
                      {(blog.tags || []).slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {tag}
                        </span>
                      ))}
                      {(blog.tags || []).length > 3 ? (
                        <span className="text-[11px] text-slate-400">
                          +{blog.tags.length - 3}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Sıra #{blog.displayOrder || 1} •{" "}
                      {new Date(blog.createdAt).toLocaleDateString("tr-TR")} •
                      Yorum:{" "}
                      {typeof blog.commentsCount === "number"
                        ? blog.commentsCount
                        : "-"}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Gösterim sırası
                  </div>
                  <OrderSelect
                    value={blog.displayOrder || 1}
                    max={blogs.length || 1}
                    onChange={(value) => handleOrderChange(blog._id, value)}
                    disabled={orderingId === blog._id}
                    className="w-full"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={`/admin/blogs/edit/${blog._id}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                  >
                    Düzenle
                  </Link>
                  <Link
                    to={`/admin/blogs/${blog._id}/comments`}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700"
                  >
                    Yorumlar
                  </Link>
                  <button
                    type="button"
                    onClick={() => openTranslationModal(blog)}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition ${
                      blog.hasEnglishTranslation
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    {blog.hasEnglishTranslation ? "EN Düzenle" : "EN Çeviri"}
                  </button>
                  <button
                    onClick={() => askDelete(blog._id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="-mx-4 hidden overflow-x-auto sm:mx-0 sm:block">
            <div className="admin-card overflow-hidden p-0">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-slate-50/70 text-left text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                  <tr>
                    <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      Kapak
                    </th>
                    <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      Başlık
                    </th>
                    <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      Sıra
                    </th>
                    <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      Etiketler
                    </th>
                    <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      Yorum
                    </th>
                    <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      Tarih
                    </th>
                    <th className="border border-slate-200/70 p-3 w-56 dark:border-slate-800/70">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((blog) => (
                    <tr
                      key={blog._id}
                      className="align-top transition hover:bg-indigo-50/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                        {blog.cover?.url
                          ? renderCover(
                              blog.cover,
                              blog.title,
                              "h-16 w-24 shadow-sm"
                            )
                          : "-"}
                      </td>
                      <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                        <div className="font-medium text-slate-800 dark:text-slate-100">
                          {blog.title}
                        </div>
                      </td>
                      <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                        <OrderSelect
                          value={blog.displayOrder || 1}
                          max={blogs.length || 1}
                          onChange={(value) => handleOrderChange(blog._id, value)}
                          disabled={orderingId === blog._id}
                        />
                      </td>
                      <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                        {(blog.tags || []).slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="mr-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {tag}
                          </span>
                        ))}
                        {(blog.tags || []).length > 3 ? (
                          <span className="text-[11px] text-slate-400">
                            +{blog.tags.length - 3}
                          </span>
                        ) : null}
                      </td>
                      <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                        {typeof blog.commentsCount === "number"
                          ? blog.commentsCount
                          : "-"}
                      </td>
                      <td className="border border-slate-200/70 p-3 whitespace-nowrap dark:border-slate-800/70">
                        {new Date(blog.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/admin/blogs/edit/${blog._id}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                          >
                            Düzenle
                          </Link>
                          <Link
                            to={`/admin/blogs/${blog._id}/comments`}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700"
                          >
                            Yorumlar
                          </Link>
                          <button
                            type="button"
                            onClick={() => openTranslationModal(blog)}
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition ${
                              blog.hasEnglishTranslation
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-indigo-600 hover:bg-indigo-700"
                            }`}
                          >
                            {blog.hasEnglishTranslation ? "EN Düzenle" : "EN Çeviri"}
                          </button>
                          <button
                            onClick={() => askDelete(blog._id)}
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
            </div>
          </div>
        </>
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
        title="Silme Onayı"
        message="Bu blogu silmek istediğinize emin misiniz?"
        confirmText="Evet, sil"
        cancelText="Vazgeç"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          if (confirmLoading) return;
          cancelDelete();
        }}
        loading={confirmLoading}
      />

      <BlogTranslationModal
        open={translationOpen}
        blogId={translationTarget?._id}
        blogTitle={translationTarget?.title}
        onClose={closeTranslationModal}
        onSaved={async () => {
          await fetchBlogs();
          showToast("İngilizce blog çevirisi kaydedildi.", "success", 3000);
        }}
      />
    </div>
  );
};

export default BlogList;
