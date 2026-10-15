// src/admin/pages/journal/JournalList.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api.js";
import AdminLoadingState from "../../components/AdminLoadingState.jsx";
import LoadErrorState from "../../components/LoadErrorState.jsx";
import ToastAlert from "../../components/ToastAlert";
import ConfirmModal from "../../components/ConfirmDialog.jsx";
import OrderSelect from "../../components/OrderSelect";
import JournalTranslationModal from "../../components/JournalTranslationModal.jsx";
import { getAdminFeedbackMessage } from "../../utils/mediaFeedback";
import {
  toPlainRichContent,
  toRichContentExcerpt,
} from "../../../utils/richContent.js";
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

const getJournalPlainContent = (content) => toPlainRichContent(content);
const getJournalSummary = (content) => toRichContentExcerpt(content, 120);

const JournalList = () => {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderingId, setOrderingId] = useState("");
  const [q, setQ] = useState("");
  const [loadError, setLoadError] = useState("");

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info", duration = 4000) =>
    setToast({ msg, type, duration });

  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    desc: "",
    onConfirm: null,
    loading: false,
  });
  const [translationOpen, setTranslationOpen] = useState(false);
  const [translationTarget, setTranslationTarget] = useState(null);

  const inputCls =
    "w-full sm:w-72 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/30";

  const openConfirm = (title, desc, onConfirm) =>
    setConfirm({ open: true, title, desc, onConfirm, loading: false });
  const closeConfirm = () =>
    setConfirm((current) => ({ ...current, open: false, onConfirm: null }));
  const openTranslationModal = (journal) => {
    setTranslationTarget(journal);
    setTranslationOpen(true);
  };
  const closeTranslationModal = () => {
    setTranslationOpen(false);
    setTranslationTarget(null);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const { data } = await api.get("/journals");
      setJournals(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("GET /journals error:", e?.response?.data || e);
      const message = getAdminFeedbackMessage(e, "Haberler getirilemedi.");
      setLoadError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return journals;

    return journals.filter((journal) => {
      const plainContent = getJournalPlainContent(journal.content).toLowerCase();
      return (
        journal.title?.toLowerCase().includes(search) ||
        plainContent.includes(search)
      );
    });
  }, [journals, q]);

  const handleDeleteClick = (id, title) => {
    openConfirm(
      "Haberi Sil",
      `“${title || "Adsız"}” başlıklı haberi silmek istiyor musunuz?`,
      async () => {
        try {
          setConfirm((current) => ({ ...current, loading: true }));
          await api.delete(`/journals/${id}`);
          await fetchAll();
          showToast("Haber silindi", "success");
        } catch (e) {
          console.error("DELETE /journals/:id error:", e?.response?.data || e);
          showToast(getAdminFeedbackMessage(e, "Silinemedi."), "error");
        } finally {
          closeConfirm();
        }
      }
    );
  };

  const handleOrderChange = async (id, nextOrder) => {
    try {
      setOrderingId(id);
      await api.patch(`/journals/${id}/order`, { displayOrder: nextOrder });
      await fetchAll();
      showToast("Haber sırası güncellendi.", "success", 2500);
    } catch (e) {
      console.error("PATCH /journals/:id/order error:", e?.response?.data || e);
      showToast(
        getAdminFeedbackMessage(e, "Haber sırası güncellenemedi."),
        "error"
      );
    } finally {
      setOrderingId("");
    }
  };

  const hasActiveFilters = Boolean(q.trim());
  const emptyMessage = hasActiveFilters
    ? "Aramanızla eşleşen haber bulunamadı."
    : "Henüz haber kaydı yok.";

  if (loading && !journals.length) {
    return (
      <div className="p-4 md:p-6 overflow-x-hidden">
        <AdminLoadingState
          title="Haberler yükleniyor"
          message="Haber listesi ve içerik özetleri hazırlanıyor."
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
            <span className="badge-soft">Haberler</span>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Haberler
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Listeler ve butonlar koyu/açık temaya uygun hale getirildi.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ara (başlık/içerik)"
              className={inputCls}
            />
            <Link to="/admin/journals/add" className="btn-admin-primary shrink-0">
              + Yeni Haber
            </Link>
          </div>
        </div>
      </div>

      {loadError ? (
        <LoadErrorState
          title="Haberler yüklenemedi"
          message={loadError}
          onRetry={fetchAll}
        />
      ) : null}

      {loadError && !journals.length ? null : filtered.length === 0 ? (
        <div className="admin-card p-6 text-center text-slate-500 dark:text-slate-300">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:hidden">
            {filtered.map((journal) => {
              const plainContent = getJournalPlainContent(journal.content);
              const summary = getJournalSummary(journal.content);

              return (
                <div
                  key={journal._id}
                  className="admin-card relative overflow-hidden p-4"
                >
                  <div className="flex items-start gap-3">
                    {renderCover(journal.cover, journal.title, "h-16 w-24")}

                    <div className="min-w-0 flex-1">
                      <div
                        className="font-semibold leading-snug break-words text-slate-900 dark:text-white"
                        style={clamp2}
                        title={journal.title}
                      >
                        {journal.title}
                      </div>
                      <div
                        className="mt-1 break-words text-xs text-slate-500 dark:text-slate-300"
                        style={clamp2}
                        title={plainContent}
                      >
                        {summary}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Sıra #{journal.displayOrder || 1} •{" "}
                        {journal.createdAt
                          ? new Date(journal.createdAt).toLocaleDateString(
                              "tr-TR"
                            )
                          : "-"}{" "}
                        • Beğeni: {journal.likesCount ?? 0}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Gösterim sırası
                    </div>
                    <OrderSelect
                      value={journal.displayOrder || 1}
                      max={journals.length || 1}
                      onChange={(value) =>
                        handleOrderChange(journal._id, value)
                      }
                      disabled={orderingId === journal._id}
                      className="w-full"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to={`/admin/journals/edit/${journal._id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                    >
                      Düzenle
                    </Link>
                    <button
                      type="button"
                      onClick={() => openTranslationModal(journal)}
                      className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition ${
                        journal.hasEnglishTranslation
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                    >
                      {journal.hasEnglishTranslation ? "EN Düzenle" : "EN Çeviri"}
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteClick(journal._id, journal.title)
                      }
                      className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              );
            })}
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
                      Tarih
                    </th>
                    <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      Beğeni
                    </th>
                    <th className="border border-slate-200/70 p-3 w-40 dark:border-slate-800/70">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((journal) => {
                    const plainContent = getJournalPlainContent(journal.content);
                    const summary = getJournalSummary(journal.content);

                    return (
                      <tr
                        key={journal._id}
                        className="align-top transition hover:bg-indigo-50/60 dark:hover:bg-slate-800/40"
                      >
                        <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                          {journal.cover?.url
                            ? renderCover(
                                journal.cover,
                                journal.title,
                                "h-16 w-24 shadow-sm"
                              )
                            : "-"}
                        </td>
                        <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                          <div className="font-medium text-slate-800 dark:text-slate-100">
                            {journal.title}
                          </div>
                          <div
                            className="mt-1 max-w-[40ch] line-clamp-2 text-slate-500 dark:text-slate-300"
                            title={plainContent}
                          >
                            {summary}
                          </div>
                        </td>
                        <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                          <OrderSelect
                            value={journal.displayOrder || 1}
                            max={journals.length || 1}
                            onChange={(value) =>
                              handleOrderChange(journal._id, value)
                            }
                            disabled={orderingId === journal._id}
                          />
                        </td>
                        <td className="border border-slate-200/70 p-3 whitespace-nowrap dark:border-slate-800/70">
                          {journal.createdAt
                            ? new Date(journal.createdAt).toLocaleDateString(
                                "tr-TR",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )
                            : "-"}
                        </td>
                        <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                          {journal.likesCount ?? 0}
                        </td>
                        <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                          <div className="flex gap-2">
                          <Link
                            to={`/admin/journals/edit/${journal._id}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                          >
                            Düzenle
                          </Link>
                          <button
                            type="button"
                            onClick={() => openTranslationModal(journal)}
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition ${
                              journal.hasEnglishTranslation
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-indigo-600 hover:bg-indigo-700"
                            }`}
                          >
                            {journal.hasEnglishTranslation ? "EN Düzenle" : "EN Çeviri"}
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteClick(journal._id, journal.title)
                              }
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.desc}
        confirmText="Evet, sil"
        cancelText="Vazgeç"
        loading={confirm.loading}
        onConfirm={confirm.onConfirm || (() => {})}
        onCancel={() => {
          if (confirm.loading) return;
          closeConfirm();
        }}
      />

      <JournalTranslationModal
        open={translationOpen}
        journalId={translationTarget?._id}
        journalTitle={translationTarget?.title}
        onClose={closeTranslationModal}
        onSaved={async () => {
          await fetchAll();
          showToast("İngilizce haber çevirisi kaydedildi.", "success", 3000);
        }}
      />

      {toast ? (
        <ToastAlert
          msg={toast.msg}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
};

export default JournalList;
