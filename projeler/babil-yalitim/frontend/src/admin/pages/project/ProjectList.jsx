// src/admin/pages/project/ProjectList.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { Eye, EyeOff } from "lucide-react";
import api from "../../../api";
import AdminLoadingState from "../../components/AdminLoadingState";
import LoadErrorState from "../../components/LoadErrorState";
import ToastAlert from "../../components/ToastAlert";
import ConfirmDialog from "../../components/ConfirmDialog";
import OrderSelect from "../../components/OrderSelect";
import ProjectTranslationModal from "../../components/ProjectTranslationModal";
import { getAdminFeedbackMessage } from "../../utils/mediaFeedback";
import {
  DEFAULT_SITE_SETTINGS,
  normalizeSiteSettings,
} from "../../../utils/siteSettings";
import { getMediaUrl, getVideoPosterUrl } from "../../../utils/media";

const Card = ({
  project,
  onDelete,
  onOrderChange,
  onTranslate,
  maxOrder,
  orderLoading,
}) => {
  const coverIsVideo = project?.cover?.resourceType === "video";
  const coverSrc = getMediaUrl(project?.cover);
  const coverPoster = getVideoPosterUrl(project?.cover, {
    fallbackSrc: coverSrc,
  });
  const hasCover = Boolean(coverSrc);

  return (
    <div className="admin-card relative overflow-hidden p-4">
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/60">
        {hasCover ? (
          coverIsVideo ? (
            <video
              src={coverSrc}
              poster={coverPoster || undefined}
              className="h-full w-full object-cover"
              controls={false}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={coverPoster || coverSrc}
              alt={project.title}
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-slate-400">
            Kapak yok
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="line-clamp-1 font-semibold text-slate-900 dark:text-white">
          {project.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-300">
          {project.description}
        </p>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
          <span className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800 dark:text-slate-200">
            {project.category || "Kategori yok"}
          </span>
          <span className="text-right">
            <span className="block font-semibold text-slate-600 dark:text-slate-200">
              Sıra #{project.displayOrder || 1}
            </span>
            {project.createdAt
              ? new Date(project.createdAt).toLocaleDateString("tr-TR")
              : "-"}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Gösterim sırası
        </div>
        <OrderSelect
          value={project.displayOrder || 1}
          max={maxOrder}
          onChange={(value) => onOrderChange(project._id, value)}
          disabled={orderLoading}
          className="w-full"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          to={`/admin/projects/edit/${project._id}`}
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-amber-500/25"
        >
          Düzenle
        </Link>
        <button
          type="button"
          onClick={() => onTranslate(project)}
          className={`inline-flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-md ${
            project.hasEnglishTranslation
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25"
              : "bg-gradient-to-r from-indigo-500 to-violet-500 shadow-indigo-500/25"
          }`}
        >
          {project.hasEnglishTranslation ? "EN Düzenle" : "EN Çeviri"}
        </button>
        <button
          onClick={() => onDelete(project._id, project.title)}
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-rose-500/25"
        >
          Sil
        </button>
      </div>
    </div>
  );
};

Card.propTypes = {
  project: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string,
    description: PropTypes.string,
    category: PropTypes.string,
    displayOrder: PropTypes.number,
    createdAt: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]),
    cover: PropTypes.shape({
      resourceType: PropTypes.oneOf(["image", "video"]),
      url: PropTypes.string,
    }),
    hasEnglishTranslation: PropTypes.bool,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onOrderChange: PropTypes.func.isRequired,
  onTranslate: PropTypes.func.isRequired,
  maxOrder: PropTypes.number.isRequired,
  orderLoading: PropTypes.bool,
};

const ProjectList = () => {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderingId, setOrderingId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [siteSettings, setSiteSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const inputCls =
    "w-full sm:w-64 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/30";

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState("displayOrder");

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info", duration = 4000) =>
    setToast({ msg, type, duration });
  const [translationOpen, setTranslationOpen] = useState(false);
  const [translationTarget, setTranslationTarget] = useState(null);

  const [confirm, setConfirm] = useState(null);
  const askConfirm = (config) => setConfirm(config);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const { data } = await api.get("/projects");
      setAll(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("GET /projects error:", err?.response?.data || err);
      const message = getAdminFeedbackMessage(err, "Projeler getirilemedi.");
      setLoadError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchSiteSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const { data } = await api.get("/site-settings");
      setSiteSettings(normalizeSiteSettings(data));
    } catch (err) {
      console.error("GET /site-settings error:", err?.response?.data || err);
      showToast(
        getAdminFeedbackMessage(err, "Anasayfa ayarlari getirilemedi."),
        "error"
      );
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSiteSettings();
  }, [fetchSiteSettings]);

  const cats = useMemo(() => {
    const categories = new Set();
    all.forEach((project) => project.category && categories.add(project.category));
    return ["all", ...Array.from(categories)];
  }, [all]);

  const filtered = useMemo(() => {
    let items = [...all];

    if (q.trim()) {
      const search = q.toLowerCase();
      items = items.filter(
        (project) =>
          project.title?.toLowerCase().includes(search) ||
          project.description?.toLowerCase().includes(search)
      );
    }

    if (cat !== "all") {
      items = items.filter((project) => project.category === cat);
    }

    if (sort === "displayOrder") {
      items.sort(
        (a, b) =>
          Number(a.displayOrder || Number.MAX_SAFE_INTEGER) -
            Number(b.displayOrder || Number.MAX_SAFE_INTEGER) ||
          new Date(a.createdAt) - new Date(b.createdAt)
      );
    }
    if (sort === "-createdAt") {
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (sort === "createdAt") {
      items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    if (sort === "title") {
      items.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    return items;
  }, [all, q, cat, sort]);

  const handleDelete = (id, title) => {
    askConfirm({
      title: "Proje silinsin mi?",
      message: `“${
        title || "Adsız Proje"
      }” kalıcı olarak silinecek. Bu işlemi onaylıyor musunuz?`,
      confirmText: "Evet, sil",
      cancelText: "Vazgeç",
      type: "danger",
      onConfirm: async () => {
        try {
          const { data } = await api.delete(`/projects/${id}`);
          await fetchProjects();
          showToast(data?.message || "Proje silindi.", "success");
        } catch (err) {
          console.error(
            "DELETE /projects/:id error:",
            err?.response?.data || err
          );
          showToast(getAdminFeedbackMessage(err, "Silme işleminde hata."), "error");
        }
      },
      onCancel: () => {},
    });
  };

  const handleOrderChange = async (id, nextOrder) => {
    try {
      setOrderingId(id);
      setSort("displayOrder");
      await api.patch(`/projects/${id}/order`, { displayOrder: nextOrder });
      await fetchProjects();
      showToast("Proje sırası güncellendi.", "success", 2500);
    } catch (err) {
      console.error("PATCH /projects/:id/order error:", err?.response?.data || err);
      showToast(
        getAdminFeedbackMessage(err, "Proje sırası güncellenemedi."),
        "error"
      );
    } finally {
      setOrderingId("");
    }
  };

  const handleProjectsVisibilityToggle = async () => {
    try {
      setToggleLoading(true);
      const nextVisible = !siteSettings.homeProjectsVisible;
      const { data } = await api.patch("/site-settings", {
        homeProjectsVisible: nextVisible,
      });
      const normalized = normalizeSiteSettings(data);
      setSiteSettings(normalized);
      showToast(
        normalized.homeProjectsVisible
          ? "Proje bolumu anasayfada gosterilecek."
          : "Proje bolumu anasayfada gizlendi.",
        "success"
      );
    } catch (err) {
      console.error("PATCH /site-settings error:", err?.response?.data || err);
      showToast(
        getAdminFeedbackMessage(
          err,
          "Proje bolumu gorunurlugu guncellenemedi."
        ),
        "error"
      );
    } finally {
      setToggleLoading(false);
    }
  };

  const openTranslationModal = (project) => {
    setTranslationTarget(project);
    setTranslationOpen(true);
  };

  const closeTranslationModal = () => {
    setTranslationOpen(false);
    setTranslationTarget(null);
  };

  const hasActiveFilters = Boolean(q.trim()) || cat !== "all";
  const emptyMessage = hasActiveFilters
    ? "Seçili filtrelerle eşleşen proje bulunamadı."
    : "Henüz proje kaydı yok.";

  if (loading && !all.length) {
    return (
      <div className="p-4 md:p-6">
        <AdminLoadingState
          title="Projeler yükleniyor"
          message="Proje listesi, kapaklar ve kategori filtreleri hazırlanıyor."
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="admin-section p-4 sm:p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-500/12 via-transparent to-slate-400/10 dark:from-[#2c2f36]/60 dark:via-transparent dark:to-[#1f2227]/50" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="badge-soft">Projeler</span>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Projeler
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Kartlar ve filtreler koyu/açık moda göre yeniden tasarlandı.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ara (başlık/açıklama)"
              className={`${inputCls} sm:w-64`}
            />
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className={`${inputCls} sm:w-40`}
            >
              {cats.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "Tüm Kategoriler" : category}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className={`${inputCls} sm:w-44`}
            >
              <option value="displayOrder">Gösterim sırası</option>
              <option value="-createdAt">Yeniden → Eskiye</option>
              <option value="createdAt">Eskiden → Yeniye</option>
              <option value="title">Başlığa göre</option>
            </select>
            <Link to="/admin/projects/add" className="btn-admin-primary shrink-0">
              Yeni Proje
            </Link>
          </div>
        </div>
      </div>

      <div className="admin-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-soft">Anasayfa Gorunurlugu</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                siteSettings.homeProjectsVisible
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {settingsLoading
                ? "Yukleniyor"
                : siteSettings.homeProjectsVisible
                  ? "Gosteriliyor"
                  : "Gizli"}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
            Anasayfa proje bolumu
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Projeler sonrasi kullanilacaksa bu alani tek tusla kapatip acabilirsiniz.
          </p>
          {!all.length ? (
            <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-300">
              Su an proje kaydi yok. Bolum acik kalirsa anasayfada bos bir alan
              gorunebilir.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleProjectsVisibilityToggle}
          disabled={settingsLoading || toggleLoading}
          className={`inline-flex min-w-[210px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition ${
            siteSettings.homeProjectsVisible
              ? "bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
              : "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {siteSettings.homeProjectsVisible ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
          {toggleLoading
            ? "Guncelleniyor..."
            : siteSettings.homeProjectsVisible
              ? "Anasayfada Gizle"
              : "Anasayfada Goster"}
        </button>
      </div>

      {loadError ? (
        <LoadErrorState
          title="Projeler yüklenemedi"
          message={loadError}
          onRetry={fetchProjects}
        />
      ) : null}

      {loadError && !all.length ? null : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Card
              key={project._id}
              project={project}
              onDelete={handleDelete}
              onOrderChange={handleOrderChange}
              onTranslate={openTranslationModal}
              maxOrder={all.length || 1}
              orderLoading={orderingId === project._id}
            />
          ))}
          {filtered.length === 0 ? (
            <div className="col-span-full admin-card p-6 text-center text-slate-500 dark:text-slate-300">
              {emptyMessage}
            </div>
          ) : null}
        </div>
      )}

      {confirm ? (
        <ConfirmDialog
          open
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText || "Onayla"}
          cancelText={confirm.cancelText || "Vazgeç"}
          type={confirm.type}
          loading={confirm.loading}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            if (confirm.loading) return;
            setConfirm((current) => ({ ...current, loading: true }));
            await confirm.onConfirm?.();
            setConfirm(null);
          }}
          onCancel={() => {
            if (confirm.loading) return;
            confirm.onCancel?.();
            setConfirm(null);
          }}
        />
      ) : null}

      <ProjectTranslationModal
        open={translationOpen}
        projectId={translationTarget?._id}
        projectTitle={translationTarget?.title}
        onClose={closeTranslationModal}
        onSaved={async () => {
          await fetchProjects();
          showToast("İngilizce proje çevirisi kaydedildi.", "success");
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

export default ProjectList;
